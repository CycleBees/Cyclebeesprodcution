# Cycle-Bees Backend Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Database Architecture](#database-architecture)
4. [Database Schema](#database-schema)
5. [Component Analysis](#component-analysis)
6. [Data Flow & Interactions](#data-flow--interactions)
7. [API Endpoints Complete](#api-endpoints-complete)
8. [Authentication System](#authentication-system)
9. [File Management](#file-management)
10. [Security Features](#security-features)
11. [Performance Optimizations](#performance-optimizations)
12. [Setup & Configuration](#setup--configuration)
13. [Error Handling](#error-handling)

---

## Overview

The Cycle-Bees backend is a **Node.js/Express.js** API server that manages bicycle repair and rental services. It uses SQLite as the primary database for simplicity and offline-first development, with comprehensive rate limiting, authentication, and file management capabilities.

**Key Features:**
- SQLite database with 17 tables
- JWT-based authentication with OTP verification
- File upload with S3 integration
- Comprehensive rate limiting and security
- Admin dashboard support
- Coupon and promotional systems
- Real-time statistics and analytics

---

## System Architecture

The Cycle-Bees backend follows a **layered architecture** pattern with modular design:

```
┌─────────────────────────────────────┐
│           Client Applications       │
│  (Mobile App + Admin Dashboard)     │
└─────────────────┬───────────────────┘
                  │ HTTP/HTTPS
┌─────────────────▼───────────────────┐
│           Express Server            │
│  (Rate Limiting + Middleware)       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           Route Handlers            │
│  (Auth, Repair, Rental, Dashboard)  │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           Business Logic            │
│  (Validation + Processing)          │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           Data Layer                │
│  (SQLite Database + S3 Storage)     │
└─────────────────────────────────────┘
```

---

## Database Architecture

### Technology Stack
- **Database**: SQLite 3 (file-based)
- **ORM**: Native SQLite3 driver
- **File Storage**: AWS S3 + local uploads
- **Authentication**: JWT + OTP
- **Rate Limiting**: Express Rate Limit

### Database Connection
```javascript
// Location: backend/database/connection.js
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, 'cyclebees.db');
const db = new sqlite3.Database(dbPath);
```

### Database Setup
The database is initialized with:
- Schema creation from `schema.sql`
- Default admin user (admin/admin123)
- Sample data (repair services, bicycles, coupons)
- Time slots and configuration data

---

## Database Schema

### Core Tables

#### 1. Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    age INTEGER,
    pincode VARCHAR(10),
    address TEXT,
    profile_photo VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Stores user registration and profile information
**Key Fields**: Phone (unique identifier), profile data, timestamps

#### 2. Admin Table
```sql
CREATE TABLE admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Admin authentication for dashboard access
**Default**: admin/admin123 (hashed with bcrypt)

#### 3. Repair Services Table
```sql
CREATE TABLE repair_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    special_instructions TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Available repair services with pricing
**Sample Data**: Tire repair, brake adjustment, chain lubrication, etc.

#### 4. Bicycles Table (Rental)
```sql
CREATE TABLE bicycles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    description TEXT,
    special_instructions TEXT,
    daily_rate DECIMAL(10,2) NOT NULL,
    weekly_rate DECIMAL(10,2) NOT NULL,
    delivery_charge DECIMAL(10,2) NOT NULL,
    specifications TEXT, -- JSON format
    is_available BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Available bicycles for rental
**Features**: Daily/weekly rates, delivery charges, specifications in JSON

### Request Management Tables

#### 5. Repair Requests Table
```sql
CREATE TABLE repair_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    alternate_number VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    notes TEXT,
    preferred_date DATE NOT NULL,
    time_slot_id INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'waiting_payment', 'active', 'completed', 'expired', 'rejected')),
    rejection_note TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
);
```
**Purpose**: Repair service requests from users
**Status Flow**: pending → approved → waiting_payment → active → completed
**Expiry**: Requests expire after 15 minutes by default

#### 6. Rental Requests Table
```sql
CREATE TABLE rental_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    bicycle_id INTEGER NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    alternate_number VARCHAR(15),
    email VARCHAR(100),
    delivery_address TEXT NOT NULL,
    special_instructions TEXT,
    duration_type TEXT NOT NULL CHECK (duration_type IN ('daily', 'weekly')),
    duration_count INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'waiting_payment', 'arranging_delivery', 'active_rental', 'completed', 'expired', 'rejected')),
    rejection_note TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bicycle_id) REFERENCES bicycles(id)
);
```
**Purpose**: Bicycle rental requests
**Status Flow**: pending → approved → waiting_payment → arranging_delivery → active_rental → completed

### Supporting Tables

#### 7. Time Slots Table
```sql
CREATE TABLE time_slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Available time slots for repair services
**Default Slots**: 8 slots from 6:00 AM to 10:00 PM (2-hour intervals)

#### 8. Service Mechanic Charge Table
```sql
CREATE TABLE service_mechanic_charge (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Base mechanic charge for repair services
**Default**: ₹200

#### 9. Bicycle Photos Table
```sql
CREATE TABLE bicycle_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bicycle_id INTEGER NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bicycle_id) REFERENCES bicycles(id) ON DELETE CASCADE
);
```
**Purpose**: Multiple photos per bicycle with display order

#### 10. Repair Request Services Table
```sql
CREATE TABLE repair_request_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_request_id INTEGER NOT NULL,
    repair_service_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (repair_service_id) REFERENCES repair_services(id)
);
```
**Purpose**: Many-to-many relationship between repair requests and services
**Features**: Individual pricing and discount tracking per service

#### 11. Repair Request Files Table
```sql
CREATE TABLE repair_request_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repair_request_id INTEGER NOT NULL,
    s3_key VARCHAR(255) NOT NULL,  -- S3 object key instead of full URL
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
    original_name VARCHAR(255),     -- Original filename
    file_size INTEGER,              -- File size in bytes
    display_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id) ON DELETE CASCADE
);
```
**Purpose**: File attachments for repair requests
**Storage**: AWS S3 with pre-signed URLs for security

### Business Logic Tables

#### 12. Coupons Table
```sql
CREATE TABLE coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    applicable_items TEXT, -- JSON array of item types
    usage_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Discount coupons for users
**Features**: Percentage/fixed discounts, usage limits, expiry dates

#### 13. Coupon Usage Table
```sql
CREATE TABLE coupon_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coupon_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('repair', 'rental')),
    request_id INTEGER NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```
**Purpose**: Track coupon usage by users
**Prevents**: Multiple uses of same coupon by same user

#### 14. Promotional Cards Table
```sql
CREATE TABLE promotional_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    external_link VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Promotional content for mobile app
**Features**: Display order, external links, image support

### Utility Tables

#### 15. OTP Codes Table
```sql
CREATE TABLE otp_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Temporary OTP storage for authentication
**Expiry**: 5 minutes by default

#### 16. Contact Settings Table
```sql
CREATE TABLE contact_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('phone', 'email', 'link')),
    value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Configurable contact information
**Types**: Phone numbers, email addresses, external links

#### 17. Payment Transactions Table
```sql
CREATE TABLE payment_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_type TEXT NOT NULL CHECK (request_type IN ('repair', 'rental')),
    request_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_id VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```
**Purpose**: Payment tracking for requests
**Status**: pending → completed/failed

---

## Component Analysis

### 1. **Server Layer (`server.js`)**

**Purpose**: Main application entry point and configuration

**Key Responsibilities**:
- **Rate Limiting**: Multiple layers of rate limiting for different endpoints
- **Middleware Setup**: CORS, Helmet, Morgan logging, Compression
- **Route Organization**: Centralized route management
- **Database Connection**: SQLite database initialization

**Rate Limiting Strategy**:
```javascript
// General API: 50,000 requests per 15 minutes
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50000,
    skip: (req) => req.path === '/health' || req.path.includes('/auth/verify-otp')
});

// Authentication: 1,000 requests per 15 minutes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000
});

// OTP: 200 requests per 5 minutes
const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 200
});
```

**Caching Strategy**:
```javascript
// Static data: 5-10 minutes cache
if (req.path.includes('/services') || req.path.includes('/time-slots')) {
    res.set('Cache-Control', 'public, max-age=300');
}
// Promotional data: 10 minutes cache
else if (req.path.includes('/promotional')) {
    res.set('Cache-Control', 'public, max-age=600');
}
```

### 2. **Authentication System (`routes/auth.js`)**

**Purpose**: User authentication and profile management

**Components**:

#### OTP Generation & Verification
```javascript
// OTP Generation
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// OTP Storage in Database
db.run(
    'INSERT OR REPLACE INTO otp_codes (phone, otp_code, expires_at) VALUES (?, ?, ?)',
    [phone, otp, expiresAt.toISOString()]
);
```

#### JWT Token Management
```javascript
// Token Generation
const token = jwt.sign(
    {
        userId: user.id,
        phone: user.phone,
        role: 'user'
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);
```

**Authentication Flow**:
1. **Send OTP**: User requests OTP → Generate 6-digit code → Store in database → Send via SMS
2. **Verify OTP**: User submits OTP → Validate against database → Check expiry → Mark as used
3. **User Creation/Login**: Check if user exists → Create new user or login existing → Generate JWT
4. **Profile Management**: Update user details with optional photo upload

### 3. **Repair Service System (`routes/repair.js`)**

**Purpose**: Handle bicycle repair requests and file management

**Key Features**:

#### File Upload System
```javascript
// Multer Configuration
const upload = multer({
    storage: multer.diskStorage({
        destination: './uploads/repair-requests',
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
        }
    }),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 6
    },
    fileFilter: (req, file, cb) => {
        // Validate file types (images + videos)
        const isImage = file.mimetype.startsWith('image/');
        const isVideo = file.mimetype.startsWith('video/');
        // Limit: 5 photos + 1 video
    }
});
```

#### S3 Integration
```javascript
// Pre-signed URL Generation
const generatePresignedUploadUrl = async (fileName, fileType, requestType) => {
    const s3Key = `${requestType}/${Date.now()}-${fileName}`;
    const command = new PutObjectCommand({
        Bucket: AWS_BUCKET_NAME,
        Key: s3Key,
        ContentType: fileType
    });
    return await getSignedUrl(s3, command, { expiresIn: 3600 });
};
```

**Repair Request Flow**:
1. **Service Selection**: User selects repair services → Calculate total amount
2. **Time Slot Booking**: Choose preferred date and time slot
3. **File Upload**: Upload photos/videos of bicycle issues
4. **Request Creation**: Store request in database with expiry time
5. **Status Management**: Track request through various states

### 4. **Rental Service System (`routes/rental.js`)**

**Purpose**: Handle bicycle rental requests

**Key Features**:
- **Bicycle Selection**: Browse available bicycles with photos
- **Duration Calculation**: Daily/weekly rental with pricing
- **Delivery Management**: Address and delivery charge handling
- **Status Tracking**: From pending to completed rental

### 5. **Admin Dashboard (`routes/dashboard.js`)**

**Purpose**: Administrative interface for managing requests

**Key Features**:

#### Statistics & Analytics
```javascript
// Dashboard Overview
db.get('SELECT COUNT(*) as total FROM users', (err, userCount) => {
    // Get user count
});
db.get('SELECT COUNT(*) as total FROM repair_requests', (err, repairCount) => {
    // Get repair requests count
});
db.get(`
    SELECT COALESCE(SUM(total_amount), 0) as total_revenue
    FROM (
        SELECT total_amount FROM repair_requests WHERE status = 'completed'
        UNION ALL
        SELECT total_amount FROM rental_requests WHERE status = 'completed'
    )
`, (err, revenueResult) => {
    // Calculate total revenue
});
```

#### Request Management
- **Status Updates**: Approve, reject, or update request status
- **User Management**: View and manage user accounts
- **Service Management**: Add/edit repair services and bicycles
- **Coupon Management**: Create and manage discount coupons

### 6. **Utility Systems**

#### SMS Service (`utils/twilio.js`)
```javascript
const sendSMS = async (number, message) => {
    try {
        await twilioClient.messages.create({
            body: message,
            from: TWILIO_NUMBER,
            to: `+91${number}`,
        });
        return true;
    } catch (e) {
        console.log("Error sending SMS: ", e);
        return false;
    }
};
```

#### S3 File Management (`utils/s3bucket.js`)
- **Upload URLs**: Generate pre-signed URLs for direct S3 uploads
- **Download URLs**: Secure file access with temporary URLs
- **File Deletion**: Clean up files when requests are cancelled

---

## Data Flow & Interactions

### 1. **User Registration Flow**
```
User Input → Validation → OTP Generation → SMS Send → OTP Verification → User Creation → JWT Token
```

### 2. **Repair Request Flow**
```
Service Selection → Price Calculation → Time Slot Booking → File Upload → Request Creation → Status Updates
```

### 3. **File Upload Flow**
```
File Selection → Validation → Local Storage → S3 Upload → Database Record → Pre-signed URL Generation
```

### 4. **Admin Management Flow**
```
Login → Dashboard Overview → Request Review → Status Update → Notification → Analytics Update
```

---

## API Endpoints Complete

### Base URL
```
http://localhost:3000/api
```

### Route Organization
```
/api/auth/*          - Authentication & user management
/api/repair/*        - Repair service requests
/api/rental/*        - Rental service requests
/api/dashboard/*     - Admin dashboard
/api/coupon/*        - Coupon management
/api/promotional/*   - Promotional content
/api/contact/*       - Contact information
```

### **Authentication Endpoints**

#### `POST /api/auth/send-otp`
**Purpose**: Send OTP to user's phone number
**Request Body**:
```json
{
  "phone": "1234567890"
}
```
**Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "phone": "1234567890",
    "expiresIn": "5 minutes"
  }
}
```
**Process**:
1. Validate phone number format
2. Generate 6-digit OTP
3. Store in database with 5-minute expiry
4. Send SMS via Twilio
5. Return success response

#### `POST /api/auth/verify-otp`
**Purpose**: Verify OTP and authenticate user
**Request Body**:
```json
{
  "phone": "1234567890",
  "otp": "123456"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "phone": "1234567890",
      "fullName": "John Doe",
      "email": "john@example.com",
      "isProfileComplete": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "isNewUser": false
  }
}
```

#### `POST /api/auth/register`
**Purpose**: Complete user registration
**Request Body**:
```json
{
  "phone": "1234567890",
  "full_name": "John Doe",
  "email": "john@example.com",
  "age": 25,
  "pincode": "123456",
  "address": "123 Main Street, City"
}
```

#### `POST /api/auth/admin/login`
**Purpose**: Admin login
**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```
**Response**:
```json
{
  "success": true,
  "message": "Admin login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### `GET /api/auth/profile`
**Purpose**: Get user profile
**Headers**: `Authorization: Bearer <token>`
**Response**: User profile data

#### `PUT /api/auth/profile`
**Purpose**: Update user profile
**Headers**: `Authorization: Bearer <token>`
**Body**: Profile data + optional photo upload

### **Repair Service Endpoints**

#### `GET /api/repair/services`
**Purpose**: Get available repair services
**Cache**: 5 minutes
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Tire Puncture Repair",
      "description": "Fix punctured tires and replace tubes if needed",
      "special_instructions": "Please specify tire size if known",
      "price": 150.00,
      "is_active": true
    }
  ]
}
```

#### `GET /api/repair/time-slots`
**Purpose**: Get available time slots
**Cache**: 5 minutes
**Response**: List of time slots

#### `GET /api/repair/mechanic-charge`
**Purpose**: Get base mechanic charge
**Cache**: 5 minutes
**Response**: Current mechanic charge amount

#### `POST /api/repair/request`
**Purpose**: Create repair request
**Headers**: `Authorization: Bearer <token>`
**Request Body** (multipart/form-data):
```json
{
  "contact_number": "1234567890",
  "alternate_number": "0987654321",
  "email": "user@example.com",
  "address": "User address",
  "notes": "Additional notes",
  "preferred_date": "2024-01-15",
  "time_slot_id": 1,
  "services": "[1, 2, 3]",
  "total_amount": 500.00,
  "payment_method": "online",
  "files": [File1, File2, ...]
}
```
**Response**:
```json
{
  "success": true,
  "message": "Repair request created successfully",
  "data": {
    "request_id": 123,
    "expires_at": "2024-01-15T10:30:00Z",
    "status": "pending"
  }
}
```

#### `GET /api/repair/requests`
**Purpose**: Get user's repair requests
**Headers**: `Authorization: Bearer <token>`
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "contact_number": "1234567890",
      "address": "User address",
      "preferred_date": "2024-01-15",
      "total_amount": 500.00,
      "status": "pending",
      "created_at": "2024-01-15T09:00:00Z",
      "services": [
        {
          "name": "Tire Puncture Repair",
          "price": 150.00
        }
      ]
    }
  ]
}
```

#### `GET /api/repair/request/:id`
**Purpose**: Get specific repair request details
**Headers**: `Authorization: Bearer <token>`
**Response**: Detailed request information

### **Rental Service Endpoints**

#### `GET /api/rental/bicycles`
**Purpose**: Get available bicycles
**Cache**: 5 minutes
**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mountain Bike Pro",
      "model": "MTB-2024",
      "description": "Professional mountain bike for off-road adventures",
      "daily_rate": 300.00,
      "weekly_rate": 1500.00,
      "delivery_charge": 100.00,
      "specifications": {
        "frame": "Aluminum",
        "wheels": "26 inch",
        "gears": "21-speed"
      },
      "photos": [
        {
          "id": 1,
          "photo_url": "https://s3.amazonaws.com/bucket/bicycle-1.jpg",
          "display_order": 0
        }
      ]
    }
  ]
}
```

#### `POST /api/rental/request`
**Purpose**: Create rental request
**Headers**: `Authorization: Bearer <token>`
**Request Body**:
```json
{
  "bicycle_id": 1,
  "contact_number": "1234567890",
  "delivery_address": "User address",
  "duration_type": "daily",
  "duration_count": 3,
  "total_amount": 1000.00,
  "payment_method": "online"
}
```

#### `GET /api/rental/requests`
**Purpose**: Get user's rental requests
**Headers**: `Authorization: Bearer <token>`
**Response**: List of user's rental requests

### **Admin Dashboard Endpoints**

#### `GET /api/dashboard/overview`
**Purpose**: Get dashboard statistics
**Headers**: `Authorization: Bearer <admin_token>`
**Response**:
```json
{
  "success": true,
  "data": {
    "total_users": 150,
    "total_repair_requests": 75,
    "total_rental_requests": 45,
    "pending_repair_requests": 12,
    "pending_rental_requests": 8,
    "total_revenue": 25000.00,
    "today_requests": 15
  }
}
```

#### `GET /api/dashboard/requests`
**Purpose**: Get all requests (admin view)
**Headers**: `Authorization: Bearer <admin_token>`
**Query Parameters**:
- `type`: repair/rental
- `status`: pending/approved/completed
- `page`: page number
- `limit`: items per page
**Response**:
```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": 123,
        "user": {
          "id": 1,
          "full_name": "John Doe",
          "phone": "1234567890"
        },
        "type": "repair",
        "status": "pending",
        "total_amount": 500.00,
        "created_at": "2024-01-15T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 75,
      "pages": 8
    }
  }
}
```

#### `PUT /api/dashboard/request/:id/status`
**Purpose**: Update request status
**Headers**: `Authorization: Bearer <admin_token>`
**Request Body**:
```json
{
  "status": "approved",
  "notes": "Request approved for tomorrow"
}
```

### **Coupon Endpoints**

#### `GET /api/coupon/validate/:code`
**Purpose**: Validate coupon code
**Request Body**:
```json
{
  "amount": 500.00,
  "items": ["repair_services"]
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "discount_amount": 50.00,
    "final_amount": 450.00,
    "coupon": {
      "code": "WELCOME10",
      "description": "Welcome discount for new users",
      "discount_type": "percentage",
      "discount_value": 10.00
    }
  }
}
```

#### `POST /api/coupon/apply`
**Purpose**: Apply coupon to request
**Headers**: `Authorization: Bearer <token>`
**Body**: Coupon details + request info

### **Promotional Endpoints**

#### `GET /api/promotional/cards`
**Purpose**: Get promotional cards
**Cache**: 10 minutes
**Response**: List of active promotional cards

### **Contact Endpoints**

#### `GET /api/contact/settings`
**Purpose**: Get contact information
**Cache**: 1 hour
**Response**: Contact details (phone, email, links)

### **File Management Endpoints**

#### `POST /api/repair/upload-urls`
**Purpose**: Generate pre-signed upload URLs
**Headers**: `Authorization: Bearer <token>`
**Request Body**:
```json
{
  "files": [
    {
      "fileName": "bicycle-damage.jpg",
      "fileType": "image/jpeg"
    }
  ]
}
```
**Response**:
```json
{
  "success": true,
  "data": {
    "uploadUrls": [
      {
        "uploadUrl": "https://s3.amazonaws.com/bucket/...",
        "s3Key": "repair/1705123456789-bicycle-damage.jpg"
      }
    ]
  }
}
```

---

## Authentication System

### JWT Token Structure
```javascript
{
  userId: 123,
  phone: "1234567890",
  role: "user", // or "admin"
  iat: 1234567890,
  exp: 1234567890
}
```

### OTP System
- **Length**: 6 digits
- **Expiry**: 5 minutes
- **Storage**: Database table
- **Rate Limiting**: 100 requests per 5 minutes per phone
- **Verification**: 500 attempts per 10 minutes per phone

### Middleware Chain
1. **Rate Limiting**: Prevents abuse
2. **Authentication**: JWT verification
3. **Authorization**: Role-based access (user/admin)
4. **Validation**: Request data validation

---

## File Management

### Upload Configuration
- **Max File Size**: 50MB per file
- **Max Files**: 6 per request (5 photos + 1 video)
- **Allowed Types**: Images (JPEG, PNG, GIF) + Videos (MP4, AVI, MOV, MKV)
- **Storage**: Local uploads + AWS S3

### S3 Integration
- **Purpose**: Secure file storage
- **Access**: Pre-signed URLs only
- **Security**: No direct file access
- **Configuration**: AWS credentials in environment

### File Flow
1. **Upload**: Files stored locally initially
2. **Processing**: Validation and optimization
3. **S3 Upload**: Files moved to S3 bucket
4. **Database**: S3 keys stored in database
5. **Access**: Pre-signed URLs generated on demand

---

## Security Features

### Rate Limiting
- **General API**: 50,000 requests per 15 minutes
- **Authentication**: 1,000 requests per 15 minutes
- **OTP Sending**: 100 requests per 5 minutes per phone
- **File Uploads**: 1,000 uploads per hour
- **User-specific**: 100,000 requests per 15 minutes per user

### Input Validation
- **Phone Numbers**: Indian format validation
- **Email**: Standard email validation
- **File Types**: MIME type + extension checking
- **Request Data**: Express-validator middleware

### CORS Configuration
```javascript
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
```

### Helmet Security
- **XSS Protection**: Enabled
- **Content Security Policy**: Configured
- **HTTPS Headers**: Production ready

---

## Performance Optimizations

### Caching Strategy
- **Static Data**: 5-10 minutes cache (services, time slots)
- **Contact Info**: 1 hour cache
- **User Data**: No cache (always fresh)

### Database Indexes
```sql
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_repair_requests_user_id ON repair_requests(user_id);
CREATE INDEX idx_repair_requests_status ON repair_requests(status);
CREATE INDEX idx_rental_requests_user_id ON rental_requests(user_id);
CREATE INDEX idx_rental_requests_status ON rental_requests(status);
CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_coupons_code ON coupons(code);
CREATE INDEX idx_promotional_cards_active ON promotional_cards(is_active);
```

### Compression
- **Response Compression**: Enabled for all responses
- **File Compression**: Automatic for static assets

---

## Setup & Configuration

### Environment Variables
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
DB_TYPE=sqlite
DB_PATH=./database/cyclebees.db

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
MAX_FILES=6

# OTP
OTP_EXPIRY_MINUTES=5
OTP_LENGTH=6

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=your-bucket

# Twilio SMS
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_NUMBER=your-twilio-number
```

### Installation Steps
1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Setup Database**:
   ```bash
   npm run setup-db
   ```

3. **Configure Environment**:
   ```bash
   cp env.example .env
   # Edit .env with your values
   ```

4. **Start Server**:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

### Database Reset
```bash
npm run reset-db    # Complete reset
npm run reset-user-data  # Reset only user data
```

### Default Credentials
- **Admin**: admin / admin123
- **Sample Data**: Repair services, bicycles, coupons included

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Technical error details (development only)"
}
```

### HTTP Status Codes
- **200**: Success
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing/invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **429**: Too Many Requests (rate limit exceeded)
- **500**: Internal Server Error

### Monitoring & Logging
- **Morgan Logging**: Development-friendly request/response logging
- **Health Check**: `GET /health` endpoint for monitoring
- **Error Tracking**: Comprehensive error logging and handling

---

This comprehensive documentation provides a complete overview of the Cycle-Bees backend system, including database structure, API endpoints, security features, and setup instructions. The system is designed for scalability, security, and ease of maintenance, providing a robust platform for bicycle repair and rental services. 