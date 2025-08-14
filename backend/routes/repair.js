const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFilesinS3, generatePresignedUploadUrl, generatePresignedDownloadUrl, deleteS3Files } = require('../utils/s3bucket');
const { runAsync } = require('../utils/utils');
const { BUCKET } = require('../utils/constants');
const router = express.Router();

// Database connection
const supabase = require('../database/supabase-connection');

// Legacy SQLite connection (commented for rollback)
// const sqlite3 = require('sqlite3').verbose();
// const dbPath = process.env.DB_PATH || './database/cyclebees.db';
// const db = new sqlite3.Database(dbPath);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/repair-requests');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 50 * 1024 * 1024,
        files: 6
    },
    fileFilter: (req, file, cb) => {
        const extname = path.extname(file.originalname).toLowerCase();

        // Initialize counters if they don't exist
        if (!req.fileValidationCounts) {
            req.fileValidationCounts = {
                photoCount: 0,
                videoCount: 0
            };
        }

        // More flexible file type checking for mobile apps
        const isImage = file.mimetype.startsWith('image/') || /\.(jpeg|jpg|png|gif)$/.test(extname);
        const isVideo = file.mimetype.startsWith('video/') || /\.(mp4|avi|mov|mkv)$/.test(extname);

        if (isImage) {
            if (req.fileValidationCounts.photoCount >= 5) {
                return cb(new Error('Maximum 5 photos allowed'));
            }
            req.fileValidationCounts.photoCount++;
            return cb(null, true);
        } else if (isVideo) {
            if (req.fileValidationCounts.videoCount >= 1) {
                return cb(new Error('Only 1 video allowed'));
            }
            req.fileValidationCounts.videoCount++;
            return cb(null, true);
        } else {
            console.log('File validation failed:', {
                originalname: file.originalname,
                mimetype: file.mimetype,
                extname: extname
            });
            return cb(new Error('Invalid file type. Only images (jpeg, jpg, png, gif) and videos (mp4, avi, mov, mkv) are allowed'));
        }
    }
}).array('files', 6);

// Error handling middleware for multer
const handleUpload = (req, res, next) => {
    console.log('=== FILE UPLOAD HANDLER STARTED ===');
    console.log('Request headers:', req.headers);
    console.log('Request body keys:', Object.keys(req.body || {}));
    
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'File too large. Maximum 50MB allowed.' 
                });
            } else if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Too many files. Maximum 6 files allowed.' 
                });
            } else {
                return res.status(400).json({ 
                    success: false, 
                    message: `Upload error: ${err.message}` 
                });
            }
        } else if (err) {
            console.error('File upload error:', err);
            return res.status(400).json({ 
                success: false, 
                message: err.message 
            });
        }
        
        console.log('=== FILE UPLOAD SUCCESS ===');
        console.log('Files received:', req.files ? req.files.map(f => ({
            fieldname: f.fieldname,
            originalname: f.originalname,
            filename: f.filename,
            mimetype: f.mimetype,
            size: f.size
        })) : 'No files');
        
        next();
    });
};

// ==================== PRE-SIGNED URL ENDPOINTS ====================

// 1. Generate pre-signed upload URL for files
router.post('/upload-urls', authenticateToken, requireUser, [
    body('files').isArray().withMessage('Files must be an array'),
    body('files.*.fileName').isString().withMessage('fileName is required'),
    body('files.*.fileType').isString().withMessage('fileType is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    try {
        const { files } = req.body;
        
        // Validate file count limits
        const photoCount = files.filter(f => f.fileType.startsWith('image/')).length;
        const videoCount = files.filter(f => f.fileType.startsWith('video/')).length;
        
        if (photoCount > 5) {
            return res.status(400).json({
                success: false,
                message: 'Maximum 5 photos allowed'
            });
        }
        
        if (videoCount > 1) {
            return res.status(400).json({
                success: false,
                message: 'Only 1 video allowed'
            });
        }

        const uploadUrls = [];
        
        for (const file of files) {
            const result = await generatePresignedUploadUrl(
                file.fileName,
                file.fileType,
                BUCKET.REPAIR_REQUESTS
            );
            
            if (result) {
                uploadUrls.push({
                    fileName: file.fileName,
                    fileType: file.fileType,
                    uploadUrl: result.uploadUrl,
                    s3Key: result.s3Key
                });
            } else {
                return res.status(500).json({
                    success: false,
                    message: `Failed to generate upload URL for ${file.fileName}`
                });
            }
        }

        res.json({
            success: true,
            data: {
                uploadUrls,
                expiresIn: '1 hour'
            }
        });

    } catch (error) {
        console.error('Error generating pre-signed upload URLs:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate upload URLs'
        });
    }
});

// 2. Generate pre-signed download URL for a file
router.get('/files/:fileId/download-url', authenticateToken, requireUser, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        // Get file info from database
        const file = await runAsync(
            'SELECT s3_key, repair_request_id FROM repair_request_files WHERE id = ?',
            [fileId]
        );
        
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
        
        // Check if user has access to this file
        const request = await runAsync(
            'SELECT user_id FROM repair_requests WHERE id = ?',
            [file.repair_request_id]
        );
        
        if (!request || request.user_id !== req.user.userId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        
        // Generate pre-signed download URL
        const downloadUrl = await generatePresignedDownloadUrl(file.s3_key);
        
        if (!downloadUrl) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate download URL'
            });
        }
        
        res.json({
            success: true,
            data: {
                downloadUrl,
                expiresIn: '1 hour'
            }
        });

    } catch (error) {
        console.error('Error generating pre-signed download URL:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate download URL'
        });
    }
});

// 3. Admin endpoint to get pre-signed download URL
router.get('/admin/files/:fileId/download-url', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { fileId } = req.params;
        
        // Get file info from database
        const file = await runAsync(
            'SELECT s3_key FROM repair_request_files WHERE id = ?',
            [fileId]
        );
        
        if (!file) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
        
        // Generate pre-signed download URL
        const downloadUrl = await generatePresignedDownloadUrl(file.s3_key);
        
        if (!downloadUrl) {
            return res.status(500).json({
                success: false,
                message: 'Failed to generate download URL'
            });
        }
        
        res.json({
            success: true,
            data: {
                downloadUrl,
                expiresIn: '1 hour'
            }
        });

    } catch (error) {
        console.error('Error generating pre-signed download URL:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate download URL'
        });
    }
});

// ==================== ADMIN ROUTES ====================

// GET /admin/requests - Get all repair requests with pagination (Admin Dashboard)
router.get('/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build the query using Supabase
        let query = supabase
            .from('repair_requests')
            .select(`
                *,
                users!repair_requests_user_id_fkey (
                    id,
                    full_name,
                    phone,
                    email
                ),
                time_slots!repair_requests_time_slot_id_fkey (
                    start_time,
                    end_time
                )
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        // Add status filter if provided
    if (status) {
            query = query.eq('status', status);
    }
    
        const { data: requests, error: requestsError } = await query;
    
        if (requestsError) {
            console.error('Error fetching repair requests:', requestsError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair requests'
            });
        }
        
        // Get services and files for each request
        const requestsWithDetails = [];
        for (const request of requests || []) {
            // Get services for this request
            const { data: services, error: servicesError } = await supabase
                .from('repair_request_services')
                .select(`
                    *,
                    repair_services!repair_request_services_repair_service_id_fkey (
                        name,
                        description,
                        special_instructions
                    )
                `)
                .eq('repair_request_id', request.id);

            if (servicesError) {
                console.error('Error fetching request services:', servicesError);
            }

            // Flatten service data structure for admin dashboard
            const flattenedServices = (services || []).map(service => ({
                id: service.repair_service_id,
                name: service.repair_services?.name || 'Unknown Service',
                description: service.repair_services?.description || '',
                special_instructions: service.repair_services?.special_instructions || '',
                price: service.price,
                discount_amount: service.discount_amount || 0
            }));

            // Calculate net amount from total amount and service discounts
            const totalDiscount = flattenedServices.reduce((sum, service) => sum + (service.discount_amount || 0), 0);
            const netAmount = (request.total_amount || 0) - totalDiscount;

            // Get files for this request
            const { data: files, error: filesError } = await supabase
                .from('repair_request_files')
                .select('id, s3_key, file_type, original_name, file_size, display_order')
                .eq('repair_request_id', request.id)
                .order('display_order');

            if (filesError) {
                console.error('Error fetching request files:', filesError);
            }

            // Generate pre-signed URLs for files
            const filesWithUrls = [];
            if (files && files.length > 0) {
                for (const file of files) {
                    try {
                        const downloadUrl = await generatePresignedDownloadUrl(file.s3_key);
                        filesWithUrls.push({
                            ...file,
                            downloadUrl: downloadUrl || null
                        });
                    } catch (error) {
                        console.error('Error generating download URL for file:', file.id, error);
                        filesWithUrls.push({
                            ...file,
                            downloadUrl: null
                        });
                    }
                }
            }

            // Flatten user information for admin dashboard
            const userInfo = request.users || {};
            const timeSlotInfo = request.time_slots || {};
            const flattenedRequest = {
                ...request,
                user_name: userInfo.full_name || 'Unknown User',
                user_phone: userInfo.phone || 'No Phone',
                start_time: timeSlotInfo.start_time || '',
                end_time: timeSlotInfo.end_time || '',
                services: flattenedServices,
                files: filesWithUrls,
                net_amount: netAmount
            };

            // Remove the nested objects to avoid confusion
            delete flattenedRequest.users;
            delete flattenedRequest.time_slots;

            requestsWithDetails.push(flattenedRequest);
        }

        res.json({
                success: true,
            data: {
                requests: requestsWithDetails,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: requestsWithDetails.length
                }
            }
        });

    } catch (error) {
        console.error('Error in GET /admin/requests:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /admin/repair-requests - Get all repair requests with pagination
router.get('/admin/repair-requests', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build the query using Supabase
        let query = supabase
            .from('repair_requests')
            .select(`
                *,
                users!repair_requests_user_id_fkey (
                    id,
                    full_name,
                    phone,
                    email
                )
            `)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        // Add status filter if provided
        if (status) {
            query = query.eq('status', status);
        }

        const { data: requests, error: requestsError } = await query;

        if (requestsError) {
            console.error('Error fetching repair requests:', requestsError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair requests'
            });
        }

        // Get services and files for each request
        const requestsWithDetails = [];
        for (const request of requests || []) {
            // Get services for this request
            const { data: services, error: servicesError } = await supabase
                .from('repair_request_services')
                .select(`
                    *,
                    repair_services!repair_request_services_repair_service_id_fkey (
                        name,
                        description,
                        special_instructions
                    )
                `)
                .eq('repair_request_id', request.id);

            if (servicesError) {
                console.error('Error fetching request services:', servicesError);
                    }

                    // Get files for this request
            const { data: files, error: filesError } = await supabase
                .from('repair_request_files')
                .select('id, s3_key, file_type, original_name, file_size, display_order')
                .eq('repair_request_id', request.id)
                .order('display_order');

            if (filesError) {
                console.error('Error fetching request files:', filesError);
                            }

                            // Generate pre-signed URLs for files
                            const filesWithUrls = [];
                            if (files && files.length > 0) {
                                for (const file of files) {
                                    try {
                                        const downloadUrl = await generatePresignedDownloadUrl(file.s3_key);
                                        filesWithUrls.push({
                                            ...file,
                                            downloadUrl: downloadUrl || null
                                        });
                                    } catch (error) {
                                        console.error('Error generating download URL for file:', file.id, error);
                                        filesWithUrls.push({
                                            ...file,
                                            downloadUrl: null
                                        });
                                    }
                                }
                            }

            requestsWithDetails.push({
                                ...request,
                                services: services || [],
                                files: filesWithUrls || []
                            });
        }

                                // Get total count
        let countQuery = supabase
            .from('repair_requests')
            .select('id', { count: 'exact' });

                                if (status) {
            countQuery = countQuery.eq('status', status);
        }

        const { count: total, error: countError } = await countQuery;

        if (countError) {
            console.error('Error counting repair requests:', countError);
                                        return res.status(500).json({
                                            success: false,
                                            message: 'Failed to count repair requests'
                                        });
                                    }

                                    res.json({
                                        success: true,
                                        data: {
                requests: requestsWithDetails,
                                            pagination: {
                                                page: parseInt(page),
                                                limit: parseInt(limit),
                    total: total || 0,
                    pages: Math.ceil((total || 0) / parseInt(limit))
                                            }
                                        }
                                    });

    } catch (error) {
        console.error('Error in GET /admin/repair-requests:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PATCH /admin/repair-requests/:id/status - Update repair request status (Admin)
router.patch('/admin/repair-requests/:id/status', authenticateToken, requireAdmin, [
    body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected']).withMessage('Invalid status'),
    body('rejectionNote').optional().isString().withMessage('Rejection note must be a string')
], async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { id } = req.params;
    const { status, rejectionNote } = req.body;
    
    // Map admin dashboard statuses to backend statuses
    const statusMapping = {
        'pending': 'pending',
        'confirmed': 'approved',
        'in_progress': 'active',
        'completed': 'completed',
        'cancelled': 'expired',
        'rejected': 'rejected'
    };
    
    const backendStatus = statusMapping[status];
    
    // If status is rejected, rejection note is required
    if (status === 'rejected' && !rejectionNote) {
        return res.status(400).json({
            success: false,
            message: 'Rejection note is required when rejecting a request'
        });
    }
    
        // Prepare update data
        const updateData = {
            status: backendStatus,
            updated_at: new Date().toISOString()
        };
    
    if (status === 'rejected') {
            updateData.rejection_note = rejectionNote;
    } else {
            updateData.rejection_note = null;
        }
        
        const { data, error } = await supabase
            .from('repair_requests')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating repair request status:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update repair request status'
            });
        }
        
        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Repair request not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Repair request status updated successfully'
        });

    } catch (error) {
        console.error('Error in PATCH /admin/repair-requests/:id/status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /admin/services - Get all repair services (Admin Dashboard)
router.get('/admin/services', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { data: services, error } = await supabase
            .from('repair_services')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching repair services:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair services'
            });
        }

        res.json({
            success: true,
            data: services || []
        });

    } catch (error) {
        console.error('Error in GET /admin/services:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});



// POST /admin/services - Create repair service (Admin Dashboard)
router.post('/admin/services', authenticateToken, requireAdmin, [
    body('name').notEmpty().withMessage('Service name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('description').optional(),
    body('special_instructions').optional()
], async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { name, description, special_instructions, price } = req.body;

        const { data, error } = await supabase
            .from('repair_services')
            .insert({
                name,
                description,
                special_instructions,
                price
            })
            .select();

        if (error) {
            console.error('Error creating repair service:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create repair service'
                });
            }

            res.status(201).json({
                success: true,
                message: 'Repair service created successfully',
            data: { id: data[0].id }
        });

    } catch (error) {
        console.error('Error in POST /admin/services:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /admin/services/:id - Update repair service (Admin Dashboard)
router.put('/admin/services/:id', authenticateToken, requireAdmin, [
    body('name').notEmpty().withMessage('Service name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required')
], async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { id } = req.params;
    const { name, description, special_instructions, price } = req.body;

        const { data, error } = await supabase
            .from('repair_services')
            .update({
                name,
                description,
                special_instructions,
                price
            })
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating repair service:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update repair service'
                });
            }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Repair service not found'
            });
        }

            res.json({
                success: true,
            message: 'Repair service updated successfully',
            data: data[0]
        });

    } catch (error) {
        console.error('Error in PUT /admin/services/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /admin/services/:id - Delete repair service (Admin Dashboard)
router.delete('/admin/services/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if service is being used in any repair requests
        console.log('Checking if service', id, 'is being used in repair requests...');
        const { data: usageCheck, error: usageError } = await supabase
            .from('repair_request_services')
            .select('id')
            .eq('repair_service_id', id)
            .limit(1);

        if (usageError) {
            console.error('Error checking service usage:', usageError);
            return res.status(500).json({
                success: false,
                message: 'Failed to check service usage'
            });
        }

        console.log('Service usage check result:', usageCheck);

        if (usageCheck && usageCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete service. It is being used in existing repair requests.'
            });
        }

        const { error } = await supabase
            .from('repair_services')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting repair service:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete repair service'
            });
        }

        res.json({
            success: true,
            message: 'Repair service deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /admin/services/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});



// GET /admin/mechanic-charge - Get service mechanic charge (Admin)
router.get('/admin/mechanic-charge', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { data: charge, error } = await supabase
            .from('service_mechanic_charge')
            .select('*')
            .eq('is_active', true)
            .order('id', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error fetching mechanic charge:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch mechanic charge'
            });
        }

        res.json({
            success: true,
            data: { charge: charge && charge.length > 0 ? charge[0].amount : 0 }
        });

    } catch (error) {
        console.error('Error in GET /admin/mechanic-charge:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /admin/mechanic-charge - Update service mechanic charge (Admin)
router.put('/admin/mechanic-charge', authenticateToken, requireAdmin, [
    body('charge').isFloat({ min: 0 }).withMessage('Valid charge is required')
], async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { charge } = req.body;

    // Deactivate current active charge
        const { error: deactivateError } = await supabase
            .from('service_mechanic_charge')
            .update({ is_active: false })
            .eq('is_active', true);

        if (deactivateError) {
            console.error('Error deactivating current charge:', deactivateError);
            return res.status(500).json({
                success: false,
                message: 'Failed to update mechanic charge'
            });
        }

        // Create new charge
        const { data, error: insertError } = await supabase
            .from('service_mechanic_charge')
            .insert({
                amount: charge,
                is_active: true
            })
            .select();

        if (insertError) {
            console.error('Error creating new charge:', insertError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to update mechanic charge'
                });
            }

            res.json({
                success: true,
                message: 'Mechanic charge updated successfully',
            data: { id: data[0].id, charge }
        });

    } catch (error) {
        console.error('Error in PUT /admin/mechanic-charge:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /admin/time-slots - Get time slots (Admin)
router.get('/admin/time-slots', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { data: slots, error } = await supabase
            .from('time_slots')
            .select('*')
            .order('start_time');

        if (error) {
            console.error('Error fetching time slots:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch time slots'
            });
        }

        res.json({
            success: true,
            data: slots || []
        });

    } catch (error) {
        console.error('Error in GET /admin/time-slots:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// POST /admin/time-slots - Create time slot (Admin)
router.post('/admin/time-slots', authenticateToken, requireAdmin, [
    body('start_time').notEmpty().withMessage('Start time is required'),
    body('end_time').notEmpty().withMessage('End time is required')
], async (req, res) => {
    try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { start_time, end_time } = req.body;

        const { data, error } = await supabase
            .from('time_slots')
            .insert({
                start_time,
                end_time,
                is_active: true
            })
            .select();

        if (error) {
            console.error('Error creating time slot:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create time slot'
                });
            }

            res.status(201).json({
                success: true,
                message: 'Time slot created successfully',
            data: { id: data[0].id }
        });

    } catch (error) {
        console.error('Error in POST /admin/time-slots:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /admin/time-slots/:id - Update time slot (Admin Dashboard)
router.put('/admin/time-slots/:id', authenticateToken, requireAdmin, [
    body('start_time').notEmpty().withMessage('Start time is required'),
    body('end_time').notEmpty().withMessage('End time is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }

    const { id } = req.params;
        const { start_time, end_time } = req.body;

        const { data, error } = await supabase
            .from('time_slots')
            .update({
                start_time,
                end_time
            })
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating time slot:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update time slot'
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Time slot not found'
            });
        }

        res.json({
            success: true,
            message: 'Time slot updated successfully',
            data: data[0]
        });

    } catch (error) {
        console.error('Error in PUT /admin/time-slots/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /admin/time-slots/:id - Delete time slot (Admin Dashboard)
router.delete('/admin/time-slots/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Check if time slot is being used in any repair requests
        const { data: usageCheck, error: usageError } = await supabase
            .from('repair_requests')
            .select('id')
            .eq('time_slot_id', id)
            .limit(1);

        if (usageError) {
            console.error('Error checking time slot usage:', usageError);
            return res.status(500).json({
                success: false,
                message: 'Failed to check time slot usage'
            });
        }

        if (usageCheck && usageCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete time slot. It is being used in existing repair requests.'
            });
        }

        const { error } = await supabase
            .from('time_slots')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting time slot:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete time slot'
            });
        }

        res.json({
            success: true,
            message: 'Time slot deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /admin/time-slots/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /admin/requests/:id - Delete repair request (Admin Dashboard)
router.delete('/admin/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
    const { id } = req.params;

        const { data, error } = await supabase
            .from('repair_requests')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error deleting repair request:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete repair request'
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Repair request not found'
            });
        }

        res.json({
            success: true,
            message: 'Repair request deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /admin/requests/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PATCH /admin/requests/:id/status - Update repair request status (Admin Dashboard)
router.patch('/admin/requests/:id/status', authenticateToken, requireAdmin, [
    body('status').isIn(['pending', 'approved', 'active', 'completed', 'rejected']).withMessage('Invalid status'),
    body('rejectionNote').optional().isString().withMessage('Rejection note must be a string')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }

        const { id } = req.params;
        const { status, rejectionNote } = req.body;
        
        // If status is rejected, rejection note is required
        if (status === 'rejected' && !rejectionNote) {
            return res.status(400).json({
                success: false,
                message: 'Rejection note is required when rejecting a request'
            });
        }
        
        // Prepare update data
        const updateData = {
            status: status,
            updated_at: new Date().toISOString()
        };
    
        if (status === 'rejected') {
            updateData.rejection_note = rejectionNote;
        } else {
            updateData.rejection_note = null;
        }
        
        const { data, error } = await supabase
            .from('repair_requests')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating repair request status:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update repair request status'
            });
        }
        
        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Repair request not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Repair request status updated successfully'
        });

    } catch (error) {
        console.error('Error in PATCH /admin/requests/:id/status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /admin/requests/:id/status - Update repair request status (Admin Dashboard) - Legacy endpoint
router.put('/admin/requests/:id/status', authenticateToken, requireAdmin, [
    body('status').isIn(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: errors.array()
            });
        }

    const { id } = req.params;
        const { status } = req.body;

        const { data, error } = await supabase
            .from('repair_requests')
            .update({ status })
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating repair request status:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update repair request status'
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Repair request not found'
            });
        }

        res.json({
            success: true,
            message: 'Repair request status updated successfully',
            data: data[0]
        });

    } catch (error) {
        console.error('Error in PUT /admin/requests/:id/status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /admin/requests/:id - Get repair request details (Admin Dashboard)
router.get('/admin/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Get request details
        const { data: request, error: requestError } = await supabase
            .from('repair_requests')
            .select(`
                *,
                users!repair_requests_user_id_fkey (
                    id,
                    full_name,
                    phone,
                    email
                ),
                time_slots!repair_requests_time_slot_id_fkey (
                    start_time,
                    end_time
                ),
                coupons!repair_requests_coupon_id_fkey (
                    id,
                    code,
                    discount_percentage
                )
            `)
            .eq('id', id)
            .single();

        if (requestError) {
            console.error('Error fetching repair request:', requestError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair request'
            });
        }

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Repair request not found'
            });
        }

        // Get services for this request
        const { data: services, error: servicesError } = await supabase
            .from('repair_request_services')
            .select(`
                *,
                repair_services!repair_request_services_repair_service_id_fkey (
                    name,
                    description,
                    special_instructions
                )
            `)
            .eq('repair_request_id', id);

        if (servicesError) {
            console.error('Error fetching request services:', servicesError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch request services'
            });
        }

        // Get files for this request
        const { data: files, error: filesError } = await supabase
            .from('repair_request_files')
            .select('*')
            .eq('repair_request_id', id)
            .order('display_order');

        if (filesError) {
            console.error('Error fetching request files:', filesError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch request files'
            });
        }

        res.json({
            success: true,
            data: {
                ...request,
                services: services || [],
                files: files || []
            }
        });

    } catch (error) {
        console.error('Error in GET /admin/requests/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /admin/repair-requests/:id - Delete repair request (Admin)
router.delete('/admin/repair-requests/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // First, get all S3 keys for files associated with this request
        const { data: files, error: filesError } = await supabase
            .from('repair_request_files')
            .select('s3_key')
            .eq('repair_request_id', id);

        if (filesError) {
            console.error('Error fetching files for deletion:', filesError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch files for deletion'
            });
        }

        const s3Keys = files ? files.map(file => file.s3_key) : [];
        console.log(`Found ${s3Keys.length} files to delete for request ${id}:`, s3Keys);

        // Delete files from S3 if any exist
        if (s3Keys.length > 0) {
            const s3DeletionResult = await deleteS3Files(s3Keys);
            console.log('S3 deletion result:', s3DeletionResult);
            
            if (!s3DeletionResult.success) {
                console.warn(`Some S3 files failed to delete: ${s3DeletionResult.failed} failed out of ${s3Keys.length} total`);
            }
        }

        // Delete database records in order
        const { error: filesDeleteError } = await supabase
            .from('repair_request_files')
            .delete()
            .eq('repair_request_id', id);

        if (filesDeleteError) {
            console.error('Error deleting repair request files:', filesDeleteError);
        }

        const { error: servicesDeleteError } = await supabase
            .from('repair_request_services')
            .delete()
            .eq('repair_request_id', id);

        if (servicesDeleteError) {
            console.error('Error deleting repair request services:', servicesDeleteError);
        }

        // Finally, delete the main request
        const { data, error: requestDeleteError } = await supabase
            .from('repair_requests')
            .delete()
            .eq('id', id)
            .select();

        if (requestDeleteError) {
            console.error('Error deleting repair request:', requestDeleteError);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete repair request'
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Repair request not found'
            });
        }

        res.json({
            success: true,
            message: `Repair request deleted successfully. ${s3Keys.length} files cleaned up from S3.`
        });

    } catch (error) {
        console.error('Error deleting repair request:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to delete repair request'
        });
    }
});

// ==================== USER ROUTES ====================

// GET /repair/services - Get available repair services (User)
router.get('/services', async (req, res) => {
    try {
        const { data: services, error } = await supabase
            .from('repair_services')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error('Error fetching repair services:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair services'
            });
        }

        res.json({
            success: true,
            data: services || []
        });

    } catch (error) {
        console.error('Error in GET /repair/services:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /repair/time-slots - Get available time slots (User)
router.get('/time-slots', async (req, res) => {
    try {
        const { data: slots, error } = await supabase
            .from('time_slots')
            .select('*')
            .eq('is_active', true)
            .order('start_time');

        if (error) {
            console.error('Error fetching time slots:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch time slots'
            });
        }

        res.json({
            success: true,
            data: slots || []
        });

    } catch (error) {
        console.error('Error in GET /repair/time-slots:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /repair/mechanic-charge - Get service mechanic charge (User)
router.get('/mechanic-charge', async (req, res) => {
    try {
        const { data: charge, error } = await supabase
            .from('service_mechanic_charge')
            .select('*')
            .eq('is_active', true)
            .order('id', { ascending: false })
            .limit(1);

        if (error) {
            console.error('Error fetching mechanic charge:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch mechanic charge'
            });
        }

        res.json({
            success: true,
            data: charge && charge.length > 0 ? charge[0] : { amount: 0 }
        });

    } catch (error) {
        console.error('Error in GET /repair/mechanic-charge:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});


// 5. Create repair request with pre-signed S3 uploads (User)
router.post('/requests/secure', authenticateToken, requireUser, [
    body('contactNumber').isString().withMessage('Contact number is required'),
    body('address').isString().withMessage('Address is required'),
    body('timeSlotId').isInt().withMessage('Time slot ID is required'),
    body('totalAmount').isFloat().withMessage('Total amount is required'),
    body('services').isArray().withMessage('Services must be an array'),
    body('files').optional().isArray().withMessage('Files must be an array'),
    body('files.*.s3Key').isString().withMessage('S3 key is required'),
    body('files.*.fileType').isString().withMessage('File type is required'),
    body('files.*.originalName').isString().withMessage('Original name is required'),
    body('files.*.fileSize').isInt().withMessage('File size is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    try {
        const {
            contactNumber,
            alternateNumber,
            email,
            notes,
            address,
            preferredDate,
            timeSlotId,
            paymentMethod,
            totalAmount,
            services,
            files = []
        } = req.body;

        // Validate services
        if (!Array.isArray(services) || services.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one service is required' });
        }
        
        for (let i = 0; i < services.length; i++) {
            const service = services[i];
            if (!service.serviceId || !service.price) {
                return res.status(400).json({ success: false, message: `Service ${i + 1} is missing required fields` });
            }
        }

        // Validate files
        if (files.length > 0) {
            const photoCount = files.filter(f => f.fileType.startsWith('image/')).length;
            const videoCount = files.filter(f => f.fileType.startsWith('video/')).length;
            
            if (photoCount > 5) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Maximum 5 photos allowed' 
                });
            }
            
            if (videoCount > 1) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Only 1 video allowed' 
                });
            }
        }

        console.log('All validations passed, proceeding with database insertion...');

        // Calculate expiry time (15 minutes from now)
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        
        // Insert repair request
        const { data: requestData, error: requestError } = await supabase
            .from('repair_requests')
            .insert({
                user_id: req.user.userId,
                contact_number: contactNumber,
                alternate_number: alternateNumber,
                email: email,
                notes: notes,
                address: address,
                preferred_date: preferredDate,
                time_slot_id: timeSlotId,
                total_amount: totalAmount,
                payment_method: paymentMethod,
                expires_at: expiresAt.toISOString()
            })
            .select();

        if (requestError) {
            console.error('Error creating repair request:', requestError);
            return res.status(500).json({ success: false, message: 'Failed to create repair request' });
        }

        const requestId = requestData[0].id;

        // Insert services
        const serviceData = services.map(service => ({
            repair_request_id: requestId,
            repair_service_id: service.serviceId,
            price: service.price,
            discount_amount: service.discountAmount || 0
        }));

        const { error: servicesError } = await supabase
            .from('repair_request_services')
            .insert(serviceData);

        if (servicesError) {
            console.error('Error inserting services:', servicesError);
            return res.status(500).json({ success: false, message: 'Failed to create repair request services' });
        }

        // Insert files (already uploaded to S3 via pre-signed URLs)
        if (files.length > 0) {
            const fileData = files.map((file, index) => ({
                repair_request_id: requestId,
                s3_key: file.s3Key,
                file_type: file.fileType.startsWith('image/') ? 'image' : 'video',
                original_name: file.originalName,
                file_size: file.fileSize,
                display_order: index
            }));

            const { error: filesError } = await supabase
                .from('repair_request_files')
                .insert(fileData);

            if (filesError) {
                console.error('Error inserting files:', filesError);
                return res.status(500).json({ success: false, message: 'Failed to create repair request files' });
            }
        }

        res.status(201).json({
            success: true,
            message: 'Repair request created successfully',
            data: { requestId }
        });

    } catch (error) {
        console.error('Unexpected error in secure repair request creation:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// GET /repair/requests - Get user's repair requests (User)
router.get('/requests', authenticateToken, requireUser, async (req, res) => {
    try {
    const { status } = req.query;

        // Build the query using Supabase
        let query = supabase
            .from('repair_requests')
            .select(`
                *,
                time_slots!repair_requests_time_slot_id_fkey (
                    start_time,
                    end_time
                )
            `)
            .eq('user_id', req.user.userId)
            .order('created_at', { ascending: false });

        // Add status filter if provided
    if (status) {
            query = query.eq('status', status);
    }

        const { data: requests, error: requestsError } = await query;

        if (requestsError) {
            console.error('Error fetching user repair requests:', requestsError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch repair requests'
            });
        }

        if (!requests || requests.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Get services and files for each request
        const requestsWithDetails = [];
        for (const request of requests) {
            // Get services for this request
            const { data: services, error: servicesError } = await supabase
                .from('repair_request_services')
                .select(`
                    *,
                    repair_services!repair_request_services_repair_service_id_fkey (
                        name,
                        description,
                        special_instructions
                    )
                `)
                .eq('repair_request_id', request.id);

            if (servicesError) {
                console.error('Error fetching request services:', servicesError);
                    }

                    // Get files for this request
            const { data: files, error: filesError } = await supabase
                .from('repair_request_files')
                .select('id, s3_key, file_type, original_name, file_size, display_order')
                .eq('repair_request_id', request.id)
                .order('display_order');

            if (filesError) {
                console.error('Error fetching request files:', filesError);
                            }

                            // Generate pre-signed URLs for files
                            const filesWithUrls = [];
                            if (files && files.length > 0) {
                                for (const file of files) {
                                    try {
                                        const downloadUrl = await generatePresignedDownloadUrl(file.s3_key);
                                        filesWithUrls.push({
                                            ...file,
                                            downloadUrl: downloadUrl || null
                                        });
                                    } catch (error) {
                                        console.error('Error generating download URL for file:', file.id, error);
                                        filesWithUrls.push({
                                            ...file,
                                            downloadUrl: null
                                        });
                                    }
                                }
                            }

                            requestsWithDetails.push({
                                ...request,
                                services: services || [],
                                files: filesWithUrls || []
                            });
        }

                                res.json({
                                    success: true,
                                    data: requestsWithDetails
                                });

    } catch (error) {
        console.error('Error in GET /repair/requests:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /repair/requests/:id - Get repair request details (User)
router.get('/requests/:id', authenticateToken, requireUser, async (req, res) => {
    try {
    const { id } = req.params;

    // Get request details
        const { data: request, error: requestError } = await supabase
            .from('repair_requests')
            .select(`
                *,
                time_slots!repair_requests_time_slot_id_fkey (
                    start_time,
                    end_time
                )
            `)
            .eq('id', id)
            .eq('user_id', req.user.userId)
            .single();

        if (requestError) {
            console.error('Error fetching repair request:', requestError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch repair request'
                });
            }

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Repair request not found'
                });
            }

            // Get services for this request
        const { data: services, error: servicesError } = await supabase
            .from('repair_request_services')
            .select(`
                *,
                repair_services!repair_request_services_repair_service_id_fkey (
                    name,
                    description,
                    special_instructions
                )
            `)
            .eq('repair_request_id', id);

        if (servicesError) {
            console.error('Error fetching request services:', servicesError);
                        return res.status(500).json({
                            success: false,
                            message: 'Failed to fetch request services'
                        });
                    }

                    // Get files for this request
        const { data: files, error: filesError } = await supabase
            .from('repair_request_files')
            .select('*')
            .eq('repair_request_id', id)
            .order('display_order');

        if (filesError) {
            console.error('Error fetching request files:', filesError);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Failed to fetch request files'
                                });
                            }

                            res.json({
                                success: true,
                                data: {
                                    ...request,
                services: services || [],
                files: files || []
            }
        });

    } catch (error) {
        console.error('Error in GET /repair/requests/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router; 