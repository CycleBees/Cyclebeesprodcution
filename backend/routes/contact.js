const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// GET /api/contact/settings - Get current contact settings (public)
router.get('/settings', async (req, res) => {
  try {
    const { data: row, error } = await db
      .from('contact_settings')
      .select('type, value, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error occurred'
      });
    }
    
    if (!row) {
      return res.json({
        success: true,
        data: null,
        message: 'No contact settings configured'
      });
    }
    
    res.json({
      success: true,
      data: {
        type: row.type,
        value: row.value,
        is_active: row.is_active
      }
    });
  } catch (error) {
    console.error('Contact settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/admin/contact-settings - Get contact settings (admin only)
router.get('/admin/contact-settings', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    
    const { data: row, error } = await db
      .from('contact_settings')
      .select('id, type, value, is_active, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error occurred'
      });
    }
    
    res.json({
      success: true,
      data: row || null
    });
  } catch (error) {
    console.error('Admin contact settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/admin/contact-settings - Update contact settings (admin only)
router.post('/admin/contact-settings', authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }
    
    const { type, value } = req.body;
    
    // Validation
    if (!type || !value) {
      return res.status(400).json({
        success: false,
        message: 'Type and value are required'
      });
    }
    
    if (!['phone', 'email', 'link'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Type must be phone, email, or link'
      });
    }
    
    // Validate based on type
    if (type === 'phone') {
      // Basic phone validation
      if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(value)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }
    } else if (type === 'email') {
      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
    } else if (type === 'link') {
      // Basic URL validation
      try {
        new URL(value);
      } catch {
        return res.status(400).json({
          success: false,
          message: 'Invalid URL format'
        });
      }
    }
    
    // Deactivate all existing settings
    const { error: deactivateError } = await db
      .from('contact_settings')
      .update({ is_active: false });
    
    if (deactivateError) {
      console.error('Database error:', deactivateError);
      return res.status(500).json({
        success: false,
        message: 'Database error occurred'
      });
    }
    
    // Insert new setting
    const { data: newSetting, error: insertError } = await db
      .from('contact_settings')
      .insert({
        type,
        value,
        is_active: true
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Database error:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Database error occurred'
      });
    }
    
    res.json({
      success: true,
      message: 'Contact settings updated successfully',
      data: {
        id: newSetting.id,
        type,
        value,
        is_active: true
      }
    });
  } catch (error) {
    console.error('Update contact settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 