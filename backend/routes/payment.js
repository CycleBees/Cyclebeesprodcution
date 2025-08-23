const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireUser } = require('../middleware/auth');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const router = express.Router();

// Database connection
const supabase = require('../database/supabase-connection');

// Initialize Razorpay instance
let razorpay;
try {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        console.warn('⚠️  Razorpay credentials not found in environment variables');
        console.warn('   Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to your .env file');
    } else {
        razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
        console.log('✅ Razorpay initialized successfully');
    }
} catch (error) {
    console.error('❌ Error initializing Razorpay:', error.message);
}

/**
 * @route POST /api/payment/create-order
 * @desc Create a Razorpay order for payment
 * @access Private
 */
router.post('/create-order', [
    authenticateToken,
    requireUser,
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('currency').optional().isIn(['INR', 'USD']).withMessage('Invalid currency'),
    body('request_type').isIn(['repair', 'rental']).withMessage('Request type must be repair or rental'),
    body('request_id').optional().isInt({ min: 1 }).withMessage('Valid request ID is required'),
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        if (!razorpay) {
            return res.status(500).json({
                success: false,
                message: 'Payment gateway not configured. Please contact support.'
            });
        }

        const { amount, currency = 'INR', request_type, request_id } = req.body;
        const userId = req.user.userId;

        // If request_id is provided, verify that the request belongs to the user
        if (request_id) {
            let requestTable = request_type === 'repair' ? 'repair_requests' : 'rental_requests';
            const { data: requestData, error: requestError } = await supabase
                .from(requestTable)
                .select('id, user_id, total_amount, status')
                .eq('id', request_id)
                .eq('user_id', userId)
                .single();

            if (requestError || !requestData) {
                return res.status(404).json({
                    success: false,
                    message: `${request_type} request not found or does not belong to you`
                });
            }

            // Check if payment is already completed for this request
            const { data: existingPayment, error: paymentError } = await supabase
                .from('payment_transactions')
                .select('id, status, razorpay_payment_id')
                .eq('request_type', request_type)
                .eq('request_id', request_id)
                .eq('status', 'completed')
                .maybeSingle();

            if (existingPayment) {
                return res.status(400).json({
                    success: false,
                    message: 'Payment already completed for this request',
                    payment_id: existingPayment.razorpay_payment_id
                });
            }
        }

        // Convert amount to smallest currency unit (paise for INR)
        const razorpayAmount = Math.round(amount * 100);

        // Create Razorpay order
        const orderOptions = {
            amount: razorpayAmount,
            currency: currency,
            receipt: `${request_type}_${request_id || 'pending'}_${Date.now()}`,
            notes: {
                request_type,
                request_id: request_id ? request_id.toString() : 'pending',
                user_id: userId.toString()
            }
        };

        const order = await razorpay.orders.create(orderOptions);

        // Create payment transaction record
        const { data: paymentTransaction, error: transactionError } = await supabase
            .from('payment_transactions')
            .insert({
                request_type,
                request_id: request_id || null,
                user_id: userId,
                amount: amount,
                payment_method: 'online',
                status: 'pending',
                razorpay_order_id: order.id,
                payment_details: {
                    razorpay_order: order,
                    created_at: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (transactionError) {
            console.error('Error creating payment transaction:', transactionError);
            return res.status(500).json({
                success: false,
                message: 'Failed to create payment transaction'
            });
        }

        res.json({
            success: true,
            message: 'Payment order created successfully',
            data: {
                order_id: order.id,
                amount: razorpayAmount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID,
                transaction_id: paymentTransaction.id,
                order_details: order
            }
        });

    } catch (error) {
        console.error('Error creating payment order:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create payment order',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route POST /api/payment/verify
 * @desc Verify Razorpay payment signature
 * @access Private
 */
router.post('/verify', [
    authenticateToken,
    requireUser,
    body('razorpay_order_id').notEmpty().withMessage('Razorpay order ID is required'),
    body('razorpay_payment_id').notEmpty().withMessage('Razorpay payment ID is required'),
    body('razorpay_signature').notEmpty().withMessage('Razorpay signature is required'),
], async (req, res) => {
    try {
        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        if (!razorpay) {
            return res.status(500).json({
                success: false,
                message: 'Payment gateway not configured. Please contact support.'
            });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const userId = req.user.userId;

        // Find the payment transaction
        const { data: paymentTransaction, error: transactionError } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('razorpay_order_id', razorpay_order_id)
            .eq('user_id', userId)
            .single();

        if (transactionError || !paymentTransaction) {
            return res.status(404).json({
                success: false,
                message: 'Payment transaction not found'
            });
        }

        // Verify the signature
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            // Update transaction as failed
            await supabase
                .from('payment_transactions')
                .update({
                    status: 'failed',
                    payment_details: {
                        ...paymentTransaction.payment_details,
                        verification_failed_at: new Date().toISOString(),
                        signature_mismatch: true
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', paymentTransaction.id);

            return res.status(400).json({
                success: false,
                message: 'Payment verification failed. Invalid signature.'
            });
        }

        // Fetch payment details from Razorpay to confirm
        let paymentDetails;
        try {
            paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
        } catch (error) {
            console.error('Error fetching payment details from Razorpay:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to verify payment with Razorpay'
            });
        }

        // Check if payment is successful
        if (paymentDetails.status !== 'captured') {
            await supabase
                .from('payment_transactions')
                .update({
                    status: 'failed',
                    razorpay_payment_id,
                    razorpay_signature,
                    payment_details: {
                        ...paymentTransaction.payment_details,
                        razorpay_payment: paymentDetails,
                        verification_failed_at: new Date().toISOString(),
                        failure_reason: `Payment status: ${paymentDetails.status}`
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', paymentTransaction.id);

            return res.status(400).json({
                success: false,
                message: `Payment not successful. Status: ${paymentDetails.status}`
            });
        }

        // Update payment transaction as successful
        const { error: updateError } = await supabase
            .from('payment_transactions')
            .update({
                status: 'completed',
                razorpay_payment_id,
                razorpay_signature,
                payment_details: {
                    ...paymentTransaction.payment_details,
                    razorpay_payment: paymentDetails,
                    verified_at: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            })
            .eq('id', paymentTransaction.id);

        if (updateError) {
            console.error('Error updating payment transaction:', updateError);
            return res.status(500).json({
                success: false,
                message: 'Payment verified but failed to update record'
            });
        }

        res.json({
            success: true,
            message: 'Payment verified successfully',
            data: {
                transaction_id: paymentTransaction.id,
                payment_id: razorpay_payment_id,
                amount: paymentDetails.amount / 100, // Convert back to rupees
                status: 'completed',
                request_type: paymentTransaction.request_type,
                request_id: paymentTransaction.request_id
            }
        });

    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify payment',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * @route GET /api/payment/status/:order_id
 * @desc Get payment status by Razorpay order ID
 * @access Private
 */
router.get('/status/:order_id', [
    authenticateToken,
    requireUser,
], async (req, res) => {
    try {
        const { order_id } = req.params;
        const userId = req.user.userId;

        const { data: paymentTransaction, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('razorpay_order_id', order_id)
            .eq('user_id', userId)
            .single();

        if (error || !paymentTransaction) {
            return res.status(404).json({
                success: false,
                message: 'Payment transaction not found'
            });
        }

        res.json({
            success: true,
            data: {
                transaction_id: paymentTransaction.id,
                status: paymentTransaction.status,
                amount: paymentTransaction.amount,
                request_type: paymentTransaction.request_type,
                request_id: paymentTransaction.request_id,
                razorpay_order_id: paymentTransaction.razorpay_order_id,
                razorpay_payment_id: paymentTransaction.razorpay_payment_id,
                created_at: paymentTransaction.created_at,
                updated_at: paymentTransaction.updated_at
            }
        });

    } catch (error) {
        console.error('Error fetching payment status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch payment status',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;