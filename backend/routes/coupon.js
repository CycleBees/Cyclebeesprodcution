const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireAdmin, requireUser } = require('../middleware/auth');
// Database connection
const supabase = require('../database/supabase-connection');


const router = express.Router();

// ==================== ADMIN COUPON MANAGEMENT ====================

// 1. List/search coupons (admin)
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        let query = supabase
            .from('coupons')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);
        
        if (search) {
            query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
        }
        
        const { data: coupons, error, count } = await query;
        
        if (error) {
            console.error('Error fetching coupons:', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
        }
        
        res.json({
            success: true,
            data: {
                coupons: coupons || [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count || 0,
                    pages: Math.ceil((count || 0) / parseInt(limit))
                }
            }
        });
        
    } catch (error) {
        console.error('Error in GET /coupon/admin:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// 2. Get coupon details (admin)
router.get('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: coupon, error } = await supabase
            .from('coupons')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error || !coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        
        res.json({ success: true, data: coupon });
        
    } catch (error) {
        console.error('Error in GET /coupon/admin/:id:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// 3. Create coupon (admin)
router.post('/admin', authenticateToken, requireAdmin, [
    body('code').isLength({ min: 3 }).withMessage('Coupon code required'),
    body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
    body('discountValue').isFloat({ min: 0.01 }).withMessage('Discount value required'),
    body('applicableItems').isArray().withMessage('Applicable items required'),
    body('usageLimit').isInt({ min: 1 }).withMessage('Usage limit required'),
    body('expiresAt').optional().isISO8601().withMessage('Invalid expiry date')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
        }
        
        const {
            code, description, discountType, discountValue, minAmount, maxDiscount,
            applicableItems, usageLimit, expiresAt, isActive = true
        } = req.body;
        
        const { data: coupon, error } = await supabase
            .from('coupons')
            .insert({
                code,
                description,
                discount_type: discountType,
                discount_value: discountValue,
                min_amount: minAmount || 0,
                max_discount: maxDiscount,
                applicable_items: JSON.stringify(applicableItems),
                usage_limit: usageLimit,
                expires_at: expiresAt,
                is_active: isActive
            })
            .select()
            .single();
        
        if (error) {
            console.error('Error creating coupon:', error);
            return res.status(500).json({ success: false, message: 'Failed to create coupon', error: error.message });
        }
        
        res.status(201).json({ success: true, message: 'Coupon created', data: { id: coupon.id } });
        
    } catch (error) {
        console.error('Error in POST /coupon/admin:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// 4. Update coupon (admin)
router.put('/admin/:id', authenticateToken, requireAdmin, [
    body('code').optional().isLength({ min: 3 }),
    body('discountType').optional().isIn(['percentage', 'fixed']),
    body('discountValue').optional().isFloat({ min: 0.01 }),
    body('applicableItems').optional().isArray(),
    body('usageLimit').optional().isInt({ min: 1 }),
    body('expiresAt').optional().isISO8601(),
    body('isActive').optional().isBoolean()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
        }
        
        const { id } = req.params;
        const updateData = {};
        
        const allowed = {
            code: 'code', description: 'description', discountType: 'discount_type', discountValue: 'discount_value',
            minAmount: 'min_amount', maxDiscount: 'max_discount', applicableItems: 'applicable_items', usageLimit: 'usage_limit',
            expiresAt: 'expires_at', isActive: 'is_active'
        };
        
        for (const key in req.body) {
            if (allowed[key]) {
                if (key === 'applicableItems') {
                    updateData[allowed[key]] = JSON.stringify(req.body[key]);
                } else {
                    updateData[allowed[key]] = req.body[key];
                }
            }
        }
        
        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid fields to update' });
        }
        
        const { data: coupon, error } = await supabase
            .from('coupons')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error updating coupon:', error);
            return res.status(500).json({ success: false, message: 'Failed to update coupon', error: error.message });
        }
        
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        
        res.json({ success: true, message: 'Coupon updated' });
        
    } catch (error) {
        console.error('Error in PUT /coupon/admin/:id:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// 5. Delete coupon (admin)
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const { data: coupon, error } = await supabase
            .from('coupons')
            .delete()
            .eq('id', id)
            .select()
            .single();
        
        if (error) {
            console.error('Error deleting coupon:', error);
            return res.status(500).json({ success: false, message: 'Failed to delete coupon' });
        }
        
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found' });
        }
        
        res.json({ success: true, message: 'Coupon deleted' });
        
    } catch (error) {
        console.error('Error in DELETE /coupon/admin/:id:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// ==================== USER COUPON ENDPOINTS ====================

// 1. Apply coupon (validate and calculate discount)
router.post('/apply', authenticateToken, requireUser, [
    body('code').notEmpty().withMessage('Coupon code required'),
    body('requestType').isIn(['repair', 'rental']).withMessage('Request type required'),
    body('items').isArray().withMessage('Items array required'), // e.g. ['repair_services', 'service_mechanic_charge']
    body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation error', errors: errors.array() });
        }
        
        const { code, requestType, items, totalAmount } = req.body;
        const userId = req.user.userId;
        
        // Get coupon details
        const { data: coupon, error: couponError } = await supabase
            .from('coupons')
            .select('*')
            .eq('code', code)
            .eq('is_active', true)
            .single();
        
        if (couponError || !coupon) {
            return res.status(404).json({ success: false, message: 'Coupon not found or inactive' });
        }
        
        // Check expiry
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return res.status(400).json({ success: false, message: 'Coupon expired' });
        }
        
        // Check usage limit
        const { data: usage, error: usageError } = await supabase
            .from('coupon_usage')
            .select('*', { count: 'exact', head: true })
            .eq('coupon_id', coupon.id)
            .eq('user_id', userId);
        
        if (usageError) {
            console.error('Error checking coupon usage:', usageError);
            return res.status(500).json({ success: false, message: 'Failed to check usage' });
        }
        
        if (usage >= coupon.usage_limit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit reached' });
        }
        
        // Check applicable items
        let applicableItems = [];
        try { 
            applicableItems = JSON.parse(coupon.applicable_items); 
        } catch (e) {
            console.error('Error parsing applicable items:', e);
        }
        
        const isApplicable = items.some(item => applicableItems.includes(item));
        if (!isApplicable) {
            return res.status(400).json({ success: false, message: 'Coupon not applicable to selected items' });
        }
        
        // Check min amount
        if (coupon.min_amount && totalAmount < coupon.min_amount) {
            return res.status(400).json({ success: false, message: `Minimum amount for coupon is ${coupon.min_amount}` });
        }
        
        // Calculate discount
        let discount = 0;
        if (coupon.discount_type === 'percentage') {
            discount = (totalAmount * coupon.discount_value) / 100;
            if (coupon.max_discount && discount > coupon.max_discount) {
                discount = coupon.max_discount;
            }
        } else if (coupon.discount_type === 'fixed') {
            discount = coupon.discount_value;
        }
        
        if (discount > totalAmount) discount = totalAmount;
        
        // (Optional: Do not record usage here, only on final booking)
        res.json({
            success: true,
            data: {
                code: coupon.code,
                discount,
                discountType: coupon.discount_type,
                discountValue: coupon.discount_value,
                description: coupon.description,
                couponId: coupon.id
            }
        });
        
    } catch (error) {
        console.error('Error in POST /coupon/apply:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// 2. List available coupons for user (active, not expired, not over usage limit)
router.get('/available', authenticateToken, requireUser, async (req, res) => {
    try {
        const userId = req.user.userId;
        const now = new Date().toISOString();
        
        // Get active coupons that haven't expired
        const { data: coupons, error: couponsError } = await supabase
            .from('coupons')
            .select('*')
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${now}`);
        
        if (couponsError) {
            console.error('Error fetching coupons:', couponsError);
            return res.status(500).json({ success: false, message: 'Failed to fetch coupons' });
        }
        
        if (!coupons || coupons.length === 0) {
            return res.json({ success: true, data: [] });
        }
        
        // For each coupon, check usage limit
        const filtered = [];
        
        for (const coupon of coupons) {
            const { data: usage, error: usageError } = await supabase
                .from('coupon_usage')
                .select('*', { count: 'exact', head: true })
                .eq('coupon_id', coupon.id)
                .eq('user_id', userId);
            
            if (!usageError && usage < coupon.usage_limit) {
                filtered.push({
                    id: coupon.id,
                    code: coupon.code,
                    description: coupon.description,
                    discountType: coupon.discount_type,
                    discountValue: coupon.discount_value,
                    minAmount: coupon.min_amount,
                    maxDiscount: coupon.max_discount,
                    applicableItems: coupon.applicable_items,
                    expiresAt: coupon.expires_at
                });
            }
        }
        
        res.json({ success: true, data: filtered });
        
    } catch (error) {
        console.error('Error in GET /coupon/available:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router; 