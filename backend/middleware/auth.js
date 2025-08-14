const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    console.log('🔐 Authenticating token for:', req.path);
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('🎫 Token:', token ? 'Present' : 'Missing');

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            console.log('❌ Token verification failed:', err.message);
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        console.log('✅ Token verified for user ID:', decoded.userId);
        req.user = decoded;
        next();
    });
};

// Middleware to verify user role
const requireUser = (req, res, next) => {
    console.log('👤 Checking user role for:', req.path);
    console.log('👤 req.user:', req.user);
    
    if (!req.user) {
        console.log('❌ No user found in request');
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    console.log('👤 User role:', req.user.role);
    if (req.user.role !== 'user') {
        console.log('❌ Invalid user role:', req.user.role);
        return res.status(403).json({
            success: false,
            message: 'User access required'
        });
    }
    
    console.log('✅ User role verified');
    next();
};

// Middleware to verify admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Admin access required'
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireUser,
    requireAdmin
}; 