const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireUser, requireAdmin } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { craftOTP } = require('../utils/utils');
const { sendSMS } = require('../utils/twilio');

// Database connection
const supabase = require('../database/supabase-connection');

// ==================== OTP-SPECIFIC RATE LIMITING ====================

// Extremely generous rate limiter for OTP sending (per phone number) - prevents lockouts
const otpSendLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // limit each phone number to 100 OTP requests per 5 minutes (extremely generous - 20 requests per minute)
    keyGenerator: (req) => req.body.phone || req.ip, // Use phone number as key
    message: {
        success: false,
        message: 'Too many OTP requests for this phone number. Please wait 5 minutes before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !req.body.phone, // Skip if no phone number provided
});

// Extremely generous rate limiter for OTP verification (per phone number) - prevents lockouts
const otpVerifyLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 500, // limit each phone number to 500 verification attempts per 10 minutes (extremely generous - 50 attempts per minute)
    keyGenerator: (req) => req.body.phone || req.ip, // Use phone number as key
    message: {
        success: false,
        message: 'Too many OTP verification attempts for this phone number. Please wait 10 minutes before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => !req.body.phone, // Skip if no phone number provided
});

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads/profile-photos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 1 // Max 1 photo
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

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate Indian phone number
function validateIndianPhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
}

// ==================== AUTHENTICATION ROUTES ====================

// 1. Send OTP
router.post('/send-otp', otpSendLimiter, [
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits')
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

        const { phone } = req.body;

        // Validate Indian phone number
        if (!validateIndianPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit Indian mobile number'
            });
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Store OTP in database
        const { error: otpError } = await supabase
            .from('otp_codes')
            .upsert({
                phone: phone,
                otp_code: otp,
                expires_at: expiresAt.toISOString(),
                is_used: false
            });

        if (otpError) {
            console.error('Error storing OTP:', otpError);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to send OTP'
                    });
                }

        // Send OTP 
        const message = craftOTP(otp);
        const isOTPSent = await sendSMS(phone, message);

        if (!isOTPSent) {
            console.error('Error sending OTP via SMS');
            return res.status(500).json({
                success: false,
                message: 'Failed to send OTP'
            });
        }

        res.json({
            success: true,
            message: 'OTP sent successfully',
            data: {
                phone,
                expiresIn: '5 minutes'
            }
        });

    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 2. Verify OTP and login/signup user
router.post('/verify-otp', otpVerifyLimiter, [
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
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

        const { phone, otp } = req.body;

        // Validate Indian phone number
        if (!validateIndianPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit Indian mobile number'
            });
        }

        // Verify OTP from database
        const { data: otpRecord, error: otpError } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('phone', phone)
            .eq('otp_code', otp)
            .gt('expires_at', new Date().toISOString())
            .eq('is_used', false)
            .single();

        if (otpError || !otpRecord) {
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid or expired OTP'
                    });
                }

                // Mark OTP as used
        await supabase
            .from('otp_codes')
            .update({ is_used: true })
            .eq('id', otpRecord.id);

                // Check if user exists
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .single();

        if (userError && userError.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking user:', userError);
                            return res.status(500).json({
                                success: false,
                                message: 'Internal server error'
                            });
                        }

        let isNewUser = false;
        let userId;

        if (!user) {
            // Create new user with temporary full_name
            const { data: newUser, error: createError } = await supabase
                .from('users')
                .insert([{ 
                    phone: phone,
                    full_name: 'User' // Temporary placeholder, will be updated during registration
                }])
                .select()
                .single();

            if (createError) {
                console.error('Error creating user:', createError);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to create user'
                });
            }

            userId = newUser.id;
            isNewUser = true;
        } else {
            userId = user.id;
        }

        // Generate JWT token
                            const token = jwt.sign(
                                {
                userId: userId,
                phone: phone,
                                    role: 'user'
                                },
                                process.env.JWT_SECRET,
                                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
                            );

                            res.json({
                                success: true,
            message: isNewUser ? 'Registration successful' : 'Login successful',
                                data: {
                    user: {
                        id: userId,
                        phone: phone,
                        fullName: user?.full_name || null,
                        email: user?.email || null,
                        isProfileComplete: !!(user?.full_name && user?.email)
                    },
                token: token,
                isNewUser: isNewUser
            }
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 3. Complete user registration
router.post('/register', [
    body('phone').isLength({ min: 10, max: 10 }).withMessage('Phone number must be 10 digits'),
    body('full_name').isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('age').isInt({ min: 1, max: 120 }).withMessage('Age must be between 1 and 120'),
    body('pincode').isLength({ min: 6, max: 6 }).withMessage('Pincode must be 6 digits'),
    body('address').isLength({ min: 10, max: 500 }).withMessage('Address must be between 10 and 500 characters')
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

        const { phone, full_name, email, age, pincode, address } = req.body;
        
        // Validate Indian phone number
        if (!validateIndianPhone(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit Indian mobile number'
            });
        }
        
        // Get user by phone number
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('phone', phone)
            .single();

        if (userError || !user) {
            return res.status(400).json({
                success: false,
                message: 'User not found. Please verify OTP first.'
            });
        }

        const userId = user.id;

        // Check if email is already taken
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .neq('id', userId)
            .single();

        if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking email:', checkError);
            return res.status(500).json({
                success: false,
                message: 'Internal server error'
                    });
                }

                if (existingUser) {
            return res.status(400).json({
                                    success: false,
                message: 'Email address is already registered'
            });
        }

        // Update user profile
        const { error: updateError } = await supabase
            .from('users')
            .update({
                full_name: full_name,
                email: email,
                age: age,
                pincode: pincode,
                address: address,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user:', updateError);
                            return res.status(500).json({
                                success: false,
                message: 'Failed to update profile'
            });
        }

        // Generate JWT token for the user
        const token = jwt.sign(
            {
                userId: userId,
                phone: phone,
                role: 'user'
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            success: true,
            message: 'Registration successful',
            data: {
                user: {
                    id: userId,
                    phone: phone,
                    fullName: full_name,
                    email: email,
                    age: age,
                    pincode: pincode,
                    address: address,
                    isProfileComplete: true
                },
                token: token
            }
        });

    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 4. Admin login
router.post('/admin/login', [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
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

        const { username, password } = req.body;

        // Get admin user
        const { data: admin, error: adminError } = await supabase
            .from('admin')
            .select('*')
            .eq('username', username)
            .single();

        if (adminError || !admin) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }

                // Verify password
                const isValidPassword = await bcrypt.compare(password, admin.password_hash);
                if (!isValidPassword) {
                    return res.status(401).json({
                        success: false,
                        message: 'Invalid credentials'
                    });
                }

                // Generate JWT token
                const token = jwt.sign(
                    {
                userId: admin.id,
                        username: admin.username,
                        role: 'admin'
                    },
                    process.env.JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
                );

                res.json({
                    success: true,
                    message: 'Admin login successful',
                    data: {
                user: {
                            id: admin.id,
                    username: admin.username,
                    role: 'admin'
                        },
                token: token
            }
        });

    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 5. Get user profile
router.get('/profile', authenticateToken, requireUser, async (req, res) => {
    try {
        console.log('🔍 Profile request - User:', req.user);
        const userId = req.user.userId;

        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('Error fetching user:', userError);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch profile'
                    });
                }

                res.json({
                    success: true,
                    data: {
                        user: {
                            id: user.id,
                            phone: user.phone,
                            fullName: user.full_name,
                            email: user.email,
                            age: user.age,
                            pincode: user.pincode,
                            address: user.address,
                            profilePhoto: user.profile_photo,
                    isProfileComplete: !!(user.full_name && user.email)
                        }
                    }
                });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// 6. Update user profile
router.put('/profile', authenticateToken, requireUser, upload.single('profile_photo'), [
    body('full_name').optional().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
    body('email').optional().isEmail().withMessage('Please enter a valid email address'),
    body('age').optional().isInt({ min: 1, max: 120 }).withMessage('Age must be between 1 and 120'),
    body('pincode').optional().isLength({ min: 6, max: 6 }).withMessage('Pincode must be 6 digits'),
    body('address').optional().isLength({ min: 10, max: 500 }).withMessage('Address must be between 10 and 500 characters')
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

        const userId = req.user.userId;
        const updateData = {};

        // Add fields to update
        if (req.body.full_name) updateData.full_name = req.body.full_name;
        if (req.body.email) updateData.email = req.body.email;
        if (req.body.age) updateData.age = parseInt(req.body.age);
        if (req.body.pincode) updateData.pincode = req.body.pincode;
        if (req.body.address) updateData.address = req.body.address;

        // Handle profile photo upload
        if (req.file) {
            // In a real application, you would upload to S3 here
            updateData.profile_photo = req.file.filename;
        }

        updateData.updated_at = new Date().toISOString();

        // Check if email is already taken (if email is being updated)
        if (req.body.email) {
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('email', req.body.email)
                .neq('id', userId)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking email:', checkError);
                    return res.status(500).json({
                        success: false,
                    message: 'Internal server error'
                });
            }

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email address is already registered'
                });
            }
        }

        // Update user profile
        const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', userId);

        if (updateError) {
            console.error('Error updating user:', updateError);
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }

                            res.json({
                                success: true,
            message: 'Profile updated successfully'
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router; 