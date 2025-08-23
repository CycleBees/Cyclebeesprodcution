-- Migration: Add Razorpay fields to payment_transactions table
-- Date: 2025-01-17
-- Description: Add fields to support Razorpay payment integration

-- Add Razorpay specific fields to payment_transactions table
ALTER TABLE payment_transactions 
ADD COLUMN IF NOT EXISTS razorpay_order_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS razorpay_payment_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS razorpay_signature VARCHAR(255),
ADD COLUMN IF NOT EXISTS payment_details JSONB;

-- Fix the request_id constraint to allow NULL values for pre-payment orders
ALTER TABLE payment_transactions 
ALTER COLUMN request_id DROP NOT NULL;

-- Add indexes for better performance on Razorpay fields
CREATE INDEX IF NOT EXISTS idx_payment_transactions_razorpay_order_id 
ON payment_transactions(razorpay_order_id);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_razorpay_payment_id 
ON payment_transactions(razorpay_payment_id);

-- Update the transaction_id column comment for clarity
COMMENT ON COLUMN payment_transactions.transaction_id IS 'Legacy transaction ID field (deprecated, use razorpay_payment_id)';
COMMENT ON COLUMN payment_transactions.razorpay_order_id IS 'Razorpay order ID returned from order creation';
COMMENT ON COLUMN payment_transactions.razorpay_payment_id IS 'Razorpay payment ID returned after successful payment';
COMMENT ON COLUMN payment_transactions.razorpay_signature IS 'Razorpay signature for payment verification';
COMMENT ON COLUMN payment_transactions.payment_details IS 'Additional payment details from Razorpay response (JSON format)';