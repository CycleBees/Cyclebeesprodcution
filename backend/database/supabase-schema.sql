-- Cycle-Bees Database Schema
-- PostgreSQL compatible schema for Supabase

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    age INTEGER,
    pincode VARCHAR(10),
    address TEXT,
    profile_photo VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Admin table (fixed credentials)
CREATE TABLE IF NOT EXISTS admin (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Repair Services table
CREATE TABLE IF NOT EXISTS repair_services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    special_instructions TEXT,
    price DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Service Mechanic Charge table
CREATE TABLE IF NOT EXISTS service_mechanic_charge (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Time Slots table
CREATE TABLE IF NOT EXISTS time_slots (
    id SERIAL PRIMARY KEY,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Coupons table (moved before repair_requests)
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2),
    applicable_items TEXT, -- JSON array of item types
    usage_limit INTEGER DEFAULT 1,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bicycles table (for rental)
CREATE TABLE IF NOT EXISTS bicycles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    description TEXT,
    special_instructions TEXT,
    daily_rate DECIMAL(10,2) NOT NULL,
    weekly_rate DECIMAL(10,2) NOT NULL,
    delivery_charge DECIMAL(10,2) NOT NULL,
    specifications TEXT, -- JSON format
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Bicycle Photos table
CREATE TABLE IF NOT EXISTS bicycle_photos (
    id SERIAL PRIMARY KEY,
    bicycle_id INTEGER NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (bicycle_id) REFERENCES bicycles(id) ON DELETE CASCADE
);

-- Repair Requests table
CREATE TABLE IF NOT EXISTS repair_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    contact_number VARCHAR(15) NOT NULL,
    alternate_number VARCHAR(15),
    email VARCHAR(100),
    address TEXT,
    notes TEXT,
    preferred_date DATE NOT NULL,
    time_slot_id INTEGER NOT NULL,
    coupon_id INTEGER,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'waiting_payment', 'active', 'completed', 'expired', 'rejected')),
    rejection_note TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id)
);

-- Repair Request Services table (many-to-many)
CREATE TABLE IF NOT EXISTS repair_request_services (
    id SERIAL PRIMARY KEY,
    repair_request_id INTEGER NOT NULL,
    repair_service_id INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (repair_service_id) REFERENCES repair_services(id)
);

-- Repair Request Files table
CREATE TABLE IF NOT EXISTS repair_request_files (
    id SERIAL PRIMARY KEY,
    repair_request_id INTEGER NOT NULL,
    s3_key VARCHAR(255) NOT NULL,  -- S3 object key instead of full URL
    file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video')),
    original_name VARCHAR(255),     -- Original filename
    file_size INTEGER,              -- File size in bytes
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (repair_request_id) REFERENCES repair_requests(id) ON DELETE CASCADE
);

-- Rental Requests table
CREATE TABLE IF NOT EXISTS rental_requests (
    id SERIAL PRIMARY KEY,
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
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bicycle_id) REFERENCES bicycles(id)
);

-- Coupon Usage table
CREATE TABLE IF NOT EXISTS coupon_usage (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    request_type TEXT NOT NULL CHECK (request_type IN ('repair', 'rental')),
    request_id INTEGER NOT NULL,
    discount_amount DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
    -- Note: Foreign key constraints for request_id will be handled in application logic
    -- since it can reference either repair_requests or rental_requests
);

-- Promotional Cards table
CREATE TABLE IF NOT EXISTS promotional_cards (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    image_url VARCHAR(255),
    external_link VARCHAR(255),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- OTP table (for temporary storage)
CREATE TABLE IF NOT EXISTS otp_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(15) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Contact Settings table (for admin configuration)
CREATE TABLE IF NOT EXISTS contact_settings (
    id SERIAL PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('phone', 'email', 'link')),
    value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Transactions table (for mock payments)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id SERIAL PRIMARY KEY,
    request_type TEXT NOT NULL CHECK (request_type IN ('repair', 'rental')),
    request_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('online', 'offline')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_repair_requests_user_id ON repair_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_repair_requests_status ON repair_requests(status);
CREATE INDEX IF NOT EXISTS idx_rental_requests_user_id ON rental_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_status ON rental_requests(status);
CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_promotional_cards_active ON promotional_cards(is_active); 