const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { runAsync } = require('../utils/utils');
const { BUCKET } = require('../utils/constants');
const { uploadFilesinS3 } = require('../utils/s3bucket');
const router = express.Router();

// Database connection
const supabase = require('../database/supabase-connection');


// Configure multer for bicycle photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/bicycles');
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
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 5 // Max 5 photos per bicycle
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

// GET /admin/requests - Get all rental requests (Admin Dashboard)
router.get('/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
    try {
    const { status, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build the query using Supabase
        let query = supabase
            .from('rental_requests')
            .select(`
                *,
                users!rental_requests_user_id_fkey (
                    full_name,
                    phone
                ),
                bicycles!rental_requests_bicycle_id_fkey (
                    name,
                    model,
                    delivery_charge
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
            console.error('Error fetching rental requests:', requestsError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch rental requests'
            });
        }

        // Get total count
        let countQuery = supabase
            .from('rental_requests')
            .select('id', { count: 'exact' });

        if (status) {
            countQuery = countQuery.eq('status', status);
        }

        const { count: total, error: countError } = await countQuery;

        if (countError) {
            console.error('Error counting rental requests:', countError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to count rental requests'
                });
            }

        // Process the data to match the expected format
        const processedRequests = (requests || []).map(request => ({
            ...request,
            user_name: request.users?.full_name,
            user_phone: request.users?.phone,
            bicycle_name: request.bicycles?.name,
            bicycle_model: request.bicycles?.model,
            delivery_charge: request.bicycles?.delivery_charge,
            // Initialize coupon fields (will be populated later if needed)
            coupon_code: null,
            coupon_discount_type: null,
            coupon_discount_value: null,
            coupon_discount_amount: 0,
            net_amount: request.total_amount
        }));

            res.json({
                success: true,
                data: {
                requests: processedRequests,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                    total: total || 0,
                    pages: Math.ceil((total || 0) / parseInt(limit))
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



// PATCH /admin/rental-requests/:id/status - Update rental request status (Admin)
router.patch('/admin/rental-requests/:id/status', authenticateToken, requireAdmin, [
    body('status').isIn(['pending', 'approved', 'waiting_payment', 'arranging_delivery', 'active_rental', 'completed', 'expired', 'rejected']).withMessage('Invalid status'),
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
            .from('rental_requests')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating rental request status:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update rental request status'
            });
        }
        
        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rental request not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Rental request status updated successfully'
        });

    } catch (error) {
        console.error('Error in PATCH /admin/rental-requests/:id/status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// PUT /admin/requests/:id/status - Update rental request status (Admin Dashboard)
router.put('/admin/requests/:id/status', authenticateToken, requireAdmin, [
    body('status').isIn(['pending', 'approved', 'waiting_payment', 'arranging_delivery', 'active_rental', 'completed', 'expired', 'rejected']).withMessage('Invalid status'),
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
            .from('rental_requests')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error updating rental request status:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update rental request status'
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Rental request not found'
            });
        }

        res.json({
            success: true,
            message: 'Rental request status updated successfully',
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

// GET /admin/requests/:id - Get rental request details (Admin Dashboard)
router.get('/admin/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Get rental request with bicycle details
        const { data: request, error: requestError } = await supabase
            .from('rental_requests')
            .select(`
                *,
                users!rental_requests_user_id_fkey (
                    id,
                    full_name,
                    phone,
                    email
                ),
                bicycles!rental_requests_bicycle_id_fkey (
                    name,
                    model,
                    description,
                    special_instructions,
                    specifications
                ),
                coupon_usage!coupon_usage_request_id_fkey (
                    discount_amount,
                    coupons!coupon_usage_coupon_id_fkey (
                        code,
                        discount_type,
                        discount_value
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (requestError) {
            console.error('Error fetching rental request:', requestError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch rental request'
            });
        }

        if (!request) {
            return res.status(404).json({
                success: false,
                message: 'Rental request not found'
            });
        }

        // Get bicycle photos
        const { data: photos, error: photosError } = await supabase
            .from('bicycle_photos')
            .select('*')
            .eq('bicycle_id', request.bicycle_id)
            .order('display_order');

        if (photosError) {
            console.error('Error fetching bicycle photos:', photosError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bicycle photos'
            });
        }

        res.json({
            success: true,
            data: {
                ...request,
                bicycle_photos: photos || []
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



// GET /admin/bicycles - Get all bicycles (Admin)
router.get('/admin/bicycles', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { data: bicycles, error } = await supabase
            .from('bicycles')
            .select('*')
            .order('name');

        if (error) {
            console.error('Error fetching bicycles:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bicycles'
            });
        }

        if (!bicycles || bicycles.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Get photos for each bicycle
        const bicyclesWithPhotos = [];
        for (const bicycle of bicycles) {
            const { data: photos, error: photosError } = await supabase
                .from('bicycle_photos')
                .select('*')
                .eq('bicycle_id', bicycle.id)
                .order('display_order');

            if (photosError) {
                console.error('Error fetching photos for bicycle:', bicycle.id, photosError);
            }

            // Generate pre-signed URLs for photos
            const photosWithUrls = await Promise.all((photos || []).map(async (photo) => {
                try {
                    const { generatePresignedDownloadURL } = require('../utils/s3bucket');
                    const downloadUrl = await generatePresignedDownloadURL(photo.s3_key);
                    return {
                        ...photo,
                        downloadUrl,
                        file_url: downloadUrl // For mobile app compatibility
                    };
                } catch (error) {
                    console.error('Error generating download URL for photo:', photo.id, error);
                    return {
                        ...photo,
                        downloadUrl: null,
                        file_url: null
                    };
                }
            }));

            bicyclesWithPhotos.push({
                    ...bicycle,
                    photos: photosWithUrls.map(p => p.downloadUrl || p.photo_url).filter(Boolean)
            });
        }

                    res.json({
                        success: true,
                        data: bicyclesWithPhotos
                    });

    } catch (error) {
        console.error('Error in GET /admin/bicycles:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 4. Create bicycle (Admin)
router.post('/admin/bicycles', authenticateToken, requireAdmin, upload.array('photos', 5), [
    body('name').notEmpty().withMessage('Bicycle name is required'),
    body('dailyRate').isFloat({ min: 0 }).withMessage('Valid daily rate is required'),
    body('weeklyRate').isFloat({ min: 0 }).withMessage('Valid weekly rate is required'),
    body('deliveryCharge').isFloat({ min: 0 }).withMessage('Valid delivery charge is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const {
        name,
        model,
        description,
        specialInstructions,
        dailyRate,
        weeklyRate,
        deliveryCharge,
        specifications
    } = req.body;

    // Insert bicycle using Supabase
    const { data: bicycle, error: insertError } = await supabase
        .from('bicycles')
        .insert({
            name: name,
            model: model || '',
            description: description || '',
            special_instructions: specialInstructions ? specialInstructions.trim().replace(/[<>]/g, '') : '',
            daily_rate: dailyRate,
            weekly_rate: weeklyRate,
            delivery_charge: deliveryCharge,
            specifications: specifications || '{}'
        })
        .select()
        .single();

    if (insertError) {
        console.error('Error creating bicycle:', insertError);
        return res.status(500).json({
            success: false,
            message: 'Failed to create bicycle'
        });
    }

    const requestId = bicycle.id;

    const failedFiles = [];

    if (req.files && req.files.length > 0) {
        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index]
            const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
            const fileUrl = `/uploads/${BUCKET.BICYCLES}/${file.filename}`;

            try {
                const s3FileURL = await uploadFilesinS3(fileUrl, file.mimetype ?? fileType, file.filename, BUCKET.BICYCLES)

                if (!s3FileURL) {
                    console.warn(`[WARN] Failed to upload file to S3: ${file.filename}`);
                    failedFiles.push(file.originalname || file.filename);
                    continue;
                }

                // Insert photo using Supabase
                const { error: photoError } = await supabase
                    .from('bicycle_photos')
                    .insert({
                        bicycle_id: requestId,
                        photo_url: s3FileURL,
                        display_order: index
                    });

                if (photoError) {
                    console.warn(`[WARN] Failed to insert photo record: ${file.filename}`, photoError);
                    failedFiles.push(file.originalname || file.filename);
                    continue;
                }
            } catch (err) {
                console.warn(`[WARN] Skipping file due to error: ${file.filename}`, err);
                failedFiles.push(file.originalname || file.filename);
                continue;
            }
        }
    }


    const response = {
        success: true,
        message: 'Bicycle created successfully',
        data: {
            id: requestId,
            photosCount: req.files.length
        }
    };

    if (failedFiles.length) {
        response.warning = `Some files failed to upload: ${failedFiles.join(', ')}`
    }

    return res.status(201).json(response);

});

// 5. Update bicycle (Admin)
router.put('/admin/bicycles/:id', authenticateToken, requireAdmin, upload.array('photos', 5), [
    body('name').notEmpty().withMessage('Bicycle name is required'),
    body('dailyRate').isFloat({ min: 0 }).withMessage('Valid daily rate is required'),
    body('weeklyRate').isFloat({ min: 0 }).withMessage('Valid weekly rate is required'),
    body('deliveryCharge').isFloat({ min: 0 }).withMessage('Valid delivery charge is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const { id } = req.params;
    const {
        name,
        model,
        description,
        specialInstructions,
        dailyRate,
        weeklyRate,
        deliveryCharge,
        specifications
    } = req.body;

    // Update bicycle using Supabase
    const { data: bicycle, error: updateError } = await supabase
        .from('bicycles')
        .update({
            name: name,
            model: model || '',
            description: description || '',
            special_instructions: specialInstructions ? specialInstructions.trim().replace(/[<>]/g, '') : '',
            daily_rate: dailyRate,
            weekly_rate: weeklyRate,
            delivery_charge: deliveryCharge,
            specifications: specifications || '{}',
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (updateError) {
        console.error('Error updating bicycle:', updateError);
        return res.status(500).json({
            success: false,
            message: 'Failed to update bicycle'
        });
    }

    const requestId = bicycle.id;

    const failedFiles = [];

    // Handle new photo uploads
    if (req.files && req.files.length > 0) {
        for (let index = 0; index < req.files.length; index++) {
            const file = req.files[index];
            const fileType = file.mimetype.startsWith('image/') ? 'image' : 'video';
            const fileUrl = `/uploads/${BUCKET.BICYCLES}/${file.filename}`

            try {
                const s3FileURL = await uploadFilesinS3(fileUrl, file.mimetype ?? fileType, file.filename, BUCKET.BICYCLES)

                if (!s3FileURL) {
                    console.warn(`[WARN] Failed to upload file to S3: ${file.filename}`);
                    failedFiles.push(file.originalname || file.filename);
                    continue;
                }

                // Insert photo using Supabase
                const { error: photoError } = await supabase
                    .from('bicycle_photos')
                    .insert({
                        bicycle_id: requestId,
                        photo_url: s3FileURL,
                        display_order: index
                    });

                if (photoError) {
                    console.warn(`[WARN] Failed to insert photo record: ${file.filename}`, photoError);
                    failedFiles.push(file.originalname || file.filename);
                    continue;
                }
            } catch (err) {
                console.warn(`[WARN] Skipping file due to error: ${file.filename}`, err);
                failedFiles.push(file.originalname || file.filename);
                continue;
            }
        }
    }

    const response = {
        success: true,
        message: 'Bicycle updated successfully'
    }

    if(failedFiles.length) {
        response.warning = `Some files failed to upload: ${failedFiles.join(', ')}`
    }

    return res.json(response);

});

// DELETE /admin/bicycles/:id - Delete bicycle (Admin)
router.delete('/admin/bicycles/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
    const { id } = req.params;

        const { data, error } = await supabase
            .from('bicycles')
            .delete()
            .eq('id', id)
            .select();

        if (error) {
            console.error('Error deleting bicycle:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete bicycle'
            });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Bicycle not found'
            });
        }

        res.json({
            success: true,
            message: 'Bicycle deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /admin/bicycles/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 7. Get bicycle details with photos (Admin)
router.get('/admin/bicycles/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
    const { id } = req.params;

        // Get bicycle details
        const { data: bicycle, error: bicycleError } = await supabase
            .from('bicycles')
            .select('*')
            .eq('id', id)
            .single();

        if (bicycleError) {
            console.error('Error fetching bicycle:', bicycleError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bicycle'
            });
        }

        if (!bicycle) {
            return res.status(404).json({
                success: false,
                message: 'Bicycle not found'
            });
        }

        // Get photos for this bicycle
        const { data: photos, error: photosError } = await supabase
            .from('bicycle_photos')
            .select('*')
            .eq('bicycle_id', id)
            .order('display_order');

        if (photosError) {
            console.error('Error fetching bicycle photos:', photosError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch bicycle photos'
                });
            }

            res.json({
                success: true,
                data: {
                    ...bicycle,
                photos: photos || []
            }
        });

    } catch (error) {
        console.error('Error in GET /admin/bicycles/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ==================== USER ROUTES ====================

// GET /rental/bicycles - Get available bicycles (User)
router.get('/bicycles', async (req, res) => {
    try {
        const { data: bicycles, error } = await supabase
            .from('bicycles')
            .select('*')
            .eq('is_available', true)
            .order('name');

        if (error) {
            console.error('Error fetching bicycles:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bicycles'
            });
        }

        if (!bicycles || bicycles.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Get photos for each bicycle
        const bicyclesWithPhotos = [];
        for (const bicycle of bicycles) {
            const { data: photos, error: photosError } = await supabase
                .from('bicycle_photos')
                .select('*')
                .eq('bicycle_id', bicycle.id)
                .order('display_order');

            if (photosError) {
                console.error('Error fetching photos for bicycle:', bicycle.id, photosError);
            }

            bicyclesWithPhotos.push({
                    ...bicycle,
                    photos: photos || []
            });
        }

                    res.json({
                        success: true,
                        data: bicyclesWithPhotos
                    });

    } catch (error) {
        console.error('Error in GET /rental/bicycles:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// GET /rental/bicycles/:id - Get bicycle details (User)
router.get('/bicycles/:id', async (req, res) => {
    try {
    const { id } = req.params;

        const { data: bicycle, error } = await supabase
            .from('bicycles')
            .select('*')
            .eq('id', id)
            .eq('is_available', true)
            .single();

        if (error) {
            console.error('Error fetching bicycle:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch bicycle'
            });
        }

        if (!bicycle) {
            return res.status(404).json({
                success: false,
                message: 'Bicycle not found or not available'
            });
        }

        // Get photos for this bicycle
        const { data: photos, error: photosError } = await supabase
            .from('bicycle_photos')
            .select('*')
            .eq('bicycle_id', id)
            .order('display_order');

        if (photosError) {
            console.error('Error fetching bicycle photos:', photosError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch bicycle photos'
                });
            }

            res.json({
                success: true,
                data: {
                    ...bicycle,
                photos: photos || []
            }
        });

    } catch (error) {
        console.error('Error in GET /rental/bicycles/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 3. Create rental request (User)
router.post('/requests', authenticateToken, requireUser, [
    body('bicycleId').isInt().withMessage('Valid bicycle ID is required'),
    body('contactNumber').isLength({ min: 10, max: 10 }).withMessage('Valid contact number is required'),
    body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
    body('durationType').isIn(['daily', 'weekly']).withMessage('Valid duration type is required'),
    body('durationCount').isInt({ min: 1 }).withMessage('Valid duration count is required'),
    body('paymentMethod').isIn(['online', 'offline']).withMessage('Valid payment method is required'),
    body('totalAmount').isFloat({ min: 0 }).withMessage('Valid total amount is required'),
    body('email').optional().isEmail().withMessage('Valid email format is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: errors.array()
        });
    }

    const {
        bicycleId,
        contactNumber,
        alternateNumber,
        email,
        deliveryAddress,
        specialInstructions,
        durationType,
        durationCount,
        paymentMethod,
        totalAmount,
        couponCode
    } = req.body;

    // Calculate expiry time (60 minutes from now for rental requests)
    const EXPIRY_MINUTES = process.env.RENTAL_EXPIRY_MINUTES || 60;
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);

    try {
        // Insert rental request
        const { data: rentalRequest, error: rentalError } = await supabase
            .from('rental_requests')
            .insert({
                user_id: req.user.userId,
                bicycle_id: bicycleId,
                contact_number: contactNumber,
                alternate_number: alternateNumber || null,
                email: email || null,
                delivery_address: deliveryAddress,
                special_instructions: specialInstructions ? specialInstructions.trim().replace(/[<>]/g, '') : null,
                duration_type: durationType,
                duration_count: durationCount,
                total_amount: totalAmount,
                payment_method: paymentMethod,
                expires_at: expiresAt.toISOString()
            })
            .select()
            .single();

        if (rentalError) {
            console.error('Error creating rental request:', rentalError);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create rental request'
                    });
                }

        const requestId = rentalRequest.id;

                // Apply coupon if provided
                if (couponCode) {
                    // Get coupon details
            const { data: coupon, error: couponError } = await supabase
                .from('coupons')
                .select('*')
                .eq('code', couponCode)
                .eq('is_active', true)
                .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
                .single();

            if (couponError) {
                console.error('Error fetching coupon:', couponError);
                            return res.status(500).json({
                                success: false,
                                message: 'Failed to apply coupon'
                            });
                        }

                        if (!coupon) {
                            return res.status(400).json({
                                success: false,
                                message: 'Invalid or expired coupon'
                            });
                        }

                        // Check usage limit
                        if (coupon.used_count >= coupon.usage_limit) {
                            return res.status(400).json({
                                success: false,
                                message: 'Coupon usage limit exceeded'
                            });
                        }

                        // Check if user has already used this coupon
            const { data: usage, error: usageError } = await supabase
                .from('coupon_usage')
                .select('*')
                .eq('coupon_id', coupon.id)
                .eq('user_id', req.user.userId);

            if (usageError) {
                console.error('Error checking coupon usage:', usageError);
                                return res.status(500).json({
                                    success: false,
                                    message: 'Failed to check coupon usage'
                                });
                            }

            if (usage && usage.length > 0) {
                                return res.status(400).json({
                                    success: false,
                                    message: 'You have already used this coupon'
                                });
                            }

                            // Calculate discount amount
                            let discountAmount = 0;
                            if (coupon.discount_type === 'percentage') {
                                discountAmount = (totalAmount * coupon.discount_value) / 100;
                                if (coupon.max_discount) {
                                    discountAmount = Math.min(discountAmount, coupon.max_discount);
                                }
                            } else {
                                discountAmount = coupon.discount_value;
                            }

                            // Record coupon usage
            const { error: usageInsertError } = await supabase
                .from('coupon_usage')
                .insert({
                    coupon_id: coupon.id,
                    user_id: req.user.userId,
                    request_type: 'rental',
                    request_id: requestId,
                    discount_amount: discountAmount
                });

            if (usageInsertError) {
                console.error('Error recording coupon usage:', usageInsertError);
                                        return res.status(500).json({
                                            success: false,
                                            message: 'Failed to apply coupon'
                                        });
                                    }

                                    // Update coupon usage count
            const { error: updateError } = await supabase
                .from('coupons')
                .update({ used_count: coupon.used_count + 1 })
                .eq('id', coupon.id);

            if (updateError) {
                console.error('Error updating coupon usage count:', updateError);
            }

                                        res.status(201).json({
                                            success: true,
                                            message: 'Rental request created successfully',
                                            data: {
                                                requestId: requestId,
                                                discountApplied: discountAmount
                                            }
                    });
                } else {
            // No coupon, just return success
                    res.status(201).json({
                        success: true,
                        message: 'Rental request created successfully',
                        data: { requestId: requestId }
                    });
                }

    } catch (error) {
        console.error('Error in POST /rental/requests:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 4. Get user's rental requests (User)
router.get('/requests', authenticateToken, requireUser, async (req, res) => {
    try {
    const { status } = req.query;

        let query = supabase
            .from('rental_requests')
            .select(`
                *,
                bicycles!rental_requests_bicycle_id_fkey (
                    name,
                    model,
                    delivery_charge
                )
            `)
            .eq('user_id', req.user.userId)
            .order('created_at', { ascending: false });

    if (status) {
            query = query.eq('status', status);
    }

        const { data: requests, error } = await query;

        if (error) {
            console.error('Error fetching user rental requests:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch rental requests'
            });
        }

        res.json({
            success: true,
            data: requests || []
        });

    } catch (error) {
        console.error('Error in GET /rental/requests:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 5. Get rental request details (User)
router.get('/requests/:id', authenticateToken, requireUser, async (req, res) => {
    try {
    const { id } = req.params;

        // Get rental request with bicycle details
        const { data: request, error: requestError } = await supabase
            .from('rental_requests')
            .select(`
                *,
                bicycles!rental_requests_bicycle_id_fkey (
                    name,
                    model,
                    description,
                    special_instructions,
                    specifications
                )
            `)
            .eq('id', id)
            .eq('user_id', req.user.userId)
            .single();

        if (requestError) {
            console.error('Error fetching rental request:', requestError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to fetch rental request'
                });
            }

            if (!request) {
                return res.status(404).json({
                    success: false,
                    message: 'Rental request not found'
                });
            }

            // Get bicycle photos
        const { data: photos, error: photosError } = await supabase
            .from('bicycle_photos')
            .select('*')
            .eq('bicycle_id', request.bicycle_id)
            .order('display_order');

        if (photosError) {
            console.error('Error fetching bicycle photos:', photosError);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to fetch bicycle photos'
                    });
                }

                res.json({
                    success: true,
                    data: {
                        ...request,
                bicycle_photos: photos || []
            }
        });

    } catch (error) {
        console.error('Error in GET /rental/requests/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /admin/requests/:id - Delete rental request (Admin Dashboard)
router.delete('/admin/requests/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // First check if the request exists
        const { data: existingRequest, error: checkError } = await supabase
            .from('rental_requests')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existingRequest) {
            return res.status(404).json({
                success: false,
                message: 'Rental request not found'
            });
        }

        // Delete the rental request
        const { error: deleteError } = await supabase
            .from('rental_requests')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting rental request:', deleteError);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete rental request'
            });
        }

        res.json({
            success: true,
            message: 'Rental request deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /admin/requests/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// DELETE /admin/bicycles/:id - Delete bicycle (Admin Dashboard)
router.delete('/admin/bicycles/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // First check if the bicycle exists
        const { data: existingBicycle, error: checkError } = await supabase
            .from('bicycles')
            .select('id')
            .eq('id', id)
            .single();

        if (checkError || !existingBicycle) {
            return res.status(404).json({
                success: false,
                message: 'Bicycle not found'
            });
        }

        // Check if there are any active rental requests for this bicycle
        const { data: activeRequests, error: requestsError } = await supabase
            .from('rental_requests')
            .select('id')
            .eq('bicycle_id', id)
            .in('status', ['pending', 'approved', 'waiting_payment', 'arranging_delivery', 'active_rental']);

        if (requestsError) {
            console.error('Error checking active requests:', requestsError);
            return res.status(500).json({
                success: false,
                message: 'Failed to check active requests'
            });
        }

        if (activeRequests && activeRequests.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete bicycle with active rental requests'
            });
        }

        // Delete bicycle photos first
        const { error: photosError } = await supabase
            .from('bicycle_photos')
            .delete()
            .eq('bicycle_id', id);

        if (photosError) {
            console.error('Error deleting bicycle photos:', photosError);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete bicycle photos'
            });
        }

        // Delete the bicycle
        const { error: deleteError } = await supabase
            .from('bicycles')
            .delete()
            .eq('id', id);

        if (deleteError) {
            console.error('Error deleting bicycle:', deleteError);
            return res.status(500).json({
                success: false,
                message: 'Failed to delete bicycle'
            });
        }

        res.json({
            success: true,
            message: 'Bicycle deleted successfully'
        });

    } catch (error) {
        console.error('Error in DELETE /admin/bicycles/:id:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router; 