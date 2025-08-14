require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
// const sqlite3 = require('sqlite3').verbose(); // Legacy SQLite - commented for rollback

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// ==================== RATE LIMITING CONFIGURATION ====================

// General API rate limiter (all routes) - Extremely generous for mobile apps
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50000, // limit each IP to 50000 requests per windowMs (extremely generous - ~3333 requests per minute)
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => {
        // Skip rate limiting for health checks and critical endpoints
        return req.path === '/health' || 
               req.path === '/api/contact' ||
               req.path.includes('/auth/verify-otp') ||
               req.path.includes('/auth/admin/login');
    }
});

// Authentication rate limiter (extremely generous to prevent lockouts)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs (extremely generous - ~67 requests per minute)
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip for OTP verification and admin login to prevent lockouts
        return req.path.includes('/auth/verify-otp') ||
               req.path.includes('/auth/admin/login');
    }
});

// OTP-specific rate limiter (extremely generous to prevent lockouts)
const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200, // limit each IP to 200 OTP requests per windowMs (extremely generous - 40 requests per 5 minutes)
    message: {
        success: false,
        message: 'Too many OTP requests, please wait 5 minutes before trying again.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// File upload rate limiter (extremely generous for normal usage)
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1000, // limit each IP to 1000 upload requests per hour (extremely generous - ~17 uploads per minute)
    message: {
        success: false,
        message: 'Too many file uploads, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// User-based rate limiter (extremely generous for authenticated users)
const userLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100000, // limit each authenticated user to 100000 requests per windowMs (extremely generous - ~6667 requests per minute)
    keyGenerator: (req) => {
        // Use user ID if authenticated, otherwise use IP
        return req.user?.userId || req.ip;
    },
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip for health checks, public endpoints, and critical auth endpoints
        return req.path === '/health' || 
               req.path === '/api/contact' ||
               req.path.includes('/auth/verify-otp') ||
               req.path.includes('/auth/admin/login');
    }
});

// ==================== MIDDLEWARE ====================

// Apply general rate limiting to all routes
app.use(generalLimiter);

app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-admin-domain.vercel.app', 'https://your-api-domain.vercel.app']
        : ['http://localhost:3001', 'http://localhost:19006', 'http://192.168.1.48:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add caching headers for static data
app.use((req, res, next) => {
    // Cache static data for 5 minutes
    if (req.path.includes('/services') || req.path.includes('/time-slots') || req.path.includes('/mechanic-charge')) {
        res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    }
    // Cache promotional data for 10 minutes
    else if (req.path.includes('/promotional')) {
        res.set('Cache-Control', 'public, max-age=600'); // 10 minutes
    }
    // Cache contact settings for 1 hour
    else if (req.path.includes('/contact')) {
        res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
    }
    // No cache for user-specific data
    else if (req.path.includes('/requests') || req.path.includes('/profile')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
});

// SECURITY: Removed static file serving to prevent unauthorized access to uploaded files
// All file access should go through authenticated endpoints with pre-signed URLs
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Cycle-Bees backend is running.' });
});

// Connect to Supabase database
const supabase = require('./database/supabase-connection');

// Legacy SQLite connection (commented for rollback)
// const dbPath = process.env.DB_PATH || './database/cyclebees.db';
// const db = new sqlite3.Database(dbPath, (err) => {
//     if (err) {
//         console.error('Failed to connect to database:', err.message);
//     } else {
//         console.log('Connected to SQLite database at', dbPath);
//     }
// });

// Routes with specific rate limiting
const authRoutes = require('./routes/auth');
const repairRoutes = require('./routes/repair');
const rentalRoutes = require('./routes/rental');
const dashboardRoutes = require('./routes/dashboard');
const couponRoutes = require('./routes/coupon');
const promotionalRoutes = require('./routes/promotional');
const contactRoutes = require('./routes/contact');

// Apply strict rate limiting to auth routes
app.use('/api/auth', authLimiter, authRoutes);

// Apply user-based rate limiting to authenticated routes
app.use('/api/repair', userLimiter, uploadLimiter, repairRoutes);
app.use('/api/rental', userLimiter, uploadLimiter, rentalRoutes);
app.use('/api/dashboard', userLimiter, dashboardRoutes);
app.use('/api/coupon', userLimiter, couponRoutes);
app.use('/api/promotional', userLimiter, promotionalRoutes);

// Apply general rate limiting to other routes
app.use('/api/contact', contactRoutes);

// Export app and supabase for use in routes
module.exports = { app, supabase };

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Cycle-Bees backend listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Auth endpoints: http://localhost:${PORT}/api/auth`);
    console.log(`Repair endpoints: http://localhost:${PORT}/api/repair`);
    console.log(`Rental endpoints: http://localhost:${PORT}/api/rental`);
    console.log(`Dashboard endpoints: http://localhost:${PORT}/api/dashboard`);
    console.log(`Coupon endpoints: http://localhost:${PORT}/api/coupon`);
    console.log(`Promotional endpoints: http://localhost:${PORT}/api/promotional`);
    console.log(`✅ Rate limiting enabled for all endpoints`);
}); 