const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFilesinS3 } = require('../utils/s3bucket');
const { BUCKET } = require('../utils/constants');
const router = express.Router();

// Database connection
const supabase = require('../database/supabase-connection');

// Legacy SQLite connection (commented for rollback)
// const sqlite3 = require('sqlite3').verbose();
// const dbPath = process.env.DB_PATH || './database/cyclebees.db';
// const db = new sqlite3.Database(dbPath);

// Helper function to transform snake_case to camelCase
const transformToCamelCase = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(transformToCamelCase);
    }
    if (obj && typeof obj === 'object') {
        const transformed = {};
        Object.keys(obj).forEach(key => {
            const camelKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            transformed[camelKey] = transformToCamelCase(obj[key]);
        });
        return transformed;
    }
    return obj;
};

// Configure multer for promotional card image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/promotional');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'promo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // 1 image per card
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'));
        }
    }
});

// ==================== ADMIN ROUTES ====================

// 1. List all promotional cards (Admin)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Set cache-busting headers
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let query = supabase
            .from('promotional_cards')
            .select('*', { count: 'exact' })
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        const { data: cards, error, count } = await query;

        if (error) {
            console.error('Error fetching promotional cards:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch promotional cards'
            });
        }

        res.json({
            success: true,
            data: {
                cards: transformToCamelCase(cards || []),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / parseInt(limit))
                }
            }
        });
        
    } catch (error) {
        console.error('Error in GET /promotional/admin:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 2. Get promotional card details (Admin)
router.get('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        // Set cache-busting headers
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        const { id } = req.params;

        const { data: card, error } = await supabase
            .from('promotional_cards')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !card) {
            return res.status(404).json({
                success: false,
                message: 'Promotional card not found'
            });
        }

        res.json({
            success: true,
            data: transformToCamelCase(card)
        });
        
    } catch (error) {
        console.error('Error in GET /promotional/admin/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 3. Create promotional card (Admin)
router.post('/admin', authenticateToken, requireAdmin, upload.single('image'), [
    body('title').notEmpty().trim().withMessage('Title is required and cannot be empty'),
    body('description').optional().trim(),
    body('externalLink').optional().custom((value) => {
        if (!value || value === '') return true; // Allow empty strings

        // Check if it's an internal route (starts with /)
        if (value.startsWith('/')) {
            return true;
        }

        // Check if it's a valid external URL
        try {
            new URL(value);
            return true;
        } catch {
            throw new Error('Invalid link format. Use a valid URL (https://example.com) or internal route (like /profile)');
        }
    }).withMessage('Invalid link format. Use a valid URL (https://example.com) or internal route (like /profile)'),
    body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a positive integer'),
    body('isActive').optional().custom((value) => {
        if (value === 'true' || value === true || value === 'false' || value === false) {
            return true; // Valid boolean values
        }
        throw new Error('isActive must be a boolean');
    }).withMessage('isActive must be a boolean')
], async (req, res) => {
    console.log('Received promotional card data:', req.body);
    console.log('Files:', req.file);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const {
        title,
        description,
        externalLink,
        displayOrder = 0,
        isActive = true
    } = req.body;

    // Convert string boolean to actual boolean
    const isActiveBool = isActive === 'true' || isActive === true;

    let imageUrl = null;

    if (req.file) {
        const fileUrl = `/uploads/promotional/${req.file.filename}`
        const s3FileURL = await uploadFilesinS3(fileUrl, req.file.mimetype ?? fileType, req.file.filename, BUCKET.PROMOTIONAL);
        console.log(s3FileURL)
        if (s3FileURL !== false) {
            imageUrl = s3FileURL
        } else {
            console.error("Error: unable to upload file to S3")
        }
    }


        const { data: card, error } = await supabase
            .from('promotional_cards')
            .insert({
                title,
                description,
                image_url: imageUrl,
                external_link: externalLink,
                display_order: displayOrder,
                is_active: isActiveBool
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating promotional card:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create promotional card',
                error: error.message
            });
        }

        res.status(201).json({
            success: true,
            message: 'Promotional card created successfully',
            data: {
                id: card.id,
                imageUrl: imageUrl
            }
        });
});

// 4. Update promotional card (Admin)
router.put('/admin/:id', authenticateToken, requireAdmin, upload.single('image'), [
    body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
    body('description').optional().trim(),
    body('externalLink').optional().custom((value) => {
        if (!value || value === '') return true; // Allow empty strings

        // Check if it's an internal route (starts with /)
        if (value.startsWith('/')) {
            return true;
        }

        // Check if it's a valid external URL
        try {
            new URL(value);
            return true;
        } catch {
            throw new Error('Invalid link format. Use a valid URL (https://example.com) or internal route (like /profile)');
        }
    }).withMessage('Invalid link format. Use a valid URL (https://example.com) or internal route (like /profile)'),
    body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a positive integer'),
    body('isActive').optional().custom((value) => {
        if (value === 'true' || value === true || value === 'false' || value === false) {
            return true; // Valid boolean values
        }
        throw new Error('isActive must be a boolean');
    }).withMessage('isActive must be a boolean')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { id } = req.params;
    const {
        title,
        description,
        externalLink,
        displayOrder,
        isActive
    } = req.body;

    // Build update data object
    const updateData = {};
    let s3FileURL = null;

    if (title !== undefined) {
        updateData.title = title;
    }
    if (description !== undefined) {
        updateData.description = description;
    }
    if (externalLink !== undefined) {
        updateData.external_link = externalLink;
    }
    if (displayOrder !== undefined) {
        updateData.display_order = displayOrder;
    }
    if (isActive !== undefined) {
        const isActiveBool = isActive === 'true' || isActive === true;
        updateData.is_active = isActiveBool;
    }

    // Handle image upload
    if (req.file) {
        const fileUrl = `/uploads/promotional/${req.file.filename}`;
        s3FileURL = await uploadFilesinS3(fileUrl, req.file.mimetype, req.file.filename, BUCKET.PROMOTIONAL);
        console.log('S3 upload result:', s3FileURL);
        
        if (s3FileURL !== false) {
            updateData.image_url = s3FileURL;
        } else {
            console.error("Error: unable to upload file to S3");
            return res.status(500).json({
                success: false,
                message: 'Failed to upload image to S3'
            });
        }
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'No valid fields to update'
        });
    }

        updateData.updated_at = new Date().toISOString();

        const { data: card, error } = await supabase
            .from('promotional_cards')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating promotional card:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update promotional card',
                error: error.message
            });
        }

        if (!card) {
            return res.status(404).json({
                success: false,
                message: 'Promotional card not found'
            });
        }

        res.json({
            success: true,
            message: 'Promotional card updated successfully',
            data: {
                imageUrl: req.file ? s3FileURL : null
            }
        });
});

// 5. Delete promotional card (Admin)
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // First get the card to delete the image file
        const { data: card, error: fetchError } = await supabase
            .from('promotional_cards')
            .select('image_url')
            .eq('id', id)
            .single();

        if (fetchError || !card) {
            return res.status(404).json({
                success: false,
                message: 'Promotional card not found'
            });
        }

        // Delete the card from database
        const { data: deletedCard, error: deleteError } = await supabase
            .from('promotional_cards')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (deleteError) {
            console.error('Error deleting promotional card:', deleteError);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete promotional card'
            });
        }

        // Delete image file if exists
        if (card.image_url) {
            const imagePath = path.join(__dirname, '..', card.image_url);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        res.json({
            success: true,
            message: 'Promotional card deleted successfully'
        });
        
    } catch (error) {
        console.error('Error in DELETE /promotional/admin/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ==================== USER ROUTES ====================

// 1. Get active promotional cards (User)
router.get('/cards', async (req, res) => {
    try {
        const { data: cards, error } = await supabase
            .from('promotional_cards')
            .select('id, title, description, image_url, external_link, display_order')
            .eq('is_active', true)
            .order('display_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching active promotional cards:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch promotional cards'
            });
        }

        res.json({
            success: true,
            data: transformToCamelCase(cards || [])
        });
        
    } catch (error) {
        console.error('Error in GET /promotional/cards:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router; 