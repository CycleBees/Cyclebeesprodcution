# Cycle-Bees Backend API
**Express.js REST API with Supabase PostgreSQL Database**

## **Overview**
Cycle-Bees Backend is a comprehensive REST API for bicycle repair and rental services. The application has been successfully migrated from SQLite to Supabase (PostgreSQL) for improved scalability and cloud deployment capabilities.

## **Features**
- 🔐 **JWT Authentication** with OTP verification
- 🚲 **Bicycle Rental Management**
- 🔧 **Repair Service Management**
- 💰 **Coupon & Promotional System**
- 📊 **Admin Dashboard Analytics**
- 📱 **SMS Integration** (Twilio)
- ☁️ **File Upload** (AWS S3)
- 🛡️ **Rate Limiting & Security**
- 📈 **Real-time Monitoring**

## **Tech Stack**
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + bcryptjs
- **File Storage**: AWS S3
- **SMS**: Twilio
- **Security**: Helmet, CORS, Rate Limiting

## **Quick Start**

### **Prerequisites**
- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- AWS S3 bucket (for file uploads)
- Twilio account (for SMS)

### **Installation**
```bash
# Clone the repository
git clone <repository-url>
cd backend

# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Configure environment variables
# Edit .env with your credentials
```

### **Environment Configuration**
```bash
# Database Configuration
SUPABASE_URL=your-supabase-project-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-s3-bucket-name

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

### **Database Setup**
```bash
# The database is already configured with Supabase
# Tables and sample data are automatically created

# Test database connection
node test-supabase-connection.js
```

### **Running the Application**
```bash
# Development mode
npm run dev

# Production mode
npm start

# The server will start on http://localhost:3000
```

## **API Endpoints**

### **Authentication**
- `POST /api/auth/send-otp` - Send OTP to phone number
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/admin/login` - Admin login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### **Repair Services**
- `GET /api/repair/services` - Get all repair services
- `GET /api/repair/time-slots` - Get available time slots
- `GET /api/repair/mechanic-charge` - Get mechanic charges
- `POST /api/repair/requests` - Create repair request
- `GET /api/repair/requests` - Get user's repair requests
- `GET /api/repair/requests/:id` - Get repair request details

### **Rental Services**
- `GET /api/rental/bicycles` - Get all bicycles
- `GET /api/rental/bicycles/:id` - Get bicycle details
- `POST /api/rental/requests` - Create rental request
- `GET /api/rental/requests` - Get user's rental requests
- `GET /api/rental/requests/:id` - Get rental request details

### **Admin Dashboard**
- `GET /api/dashboard/overview` - Dashboard statistics
- `GET /api/dashboard/users` - User management
- `GET /api/dashboard/analytics/repair` - Repair analytics
- `GET /api/dashboard/analytics/rental` - Rental analytics
- `GET /api/dashboard/recent-activity` - Recent activity

### **Coupons & Promotions**
- `GET /api/coupon/available` - Get available coupons
- `POST /api/coupon/apply` - Apply coupon to request
- `GET /api/promotional/cards` - Get promotional cards

### **Contact & Settings**
- `GET /api/contact/settings` - Get contact settings
- `POST /api/contact/admin/contact-settings` - Update contact settings

## **Database Schema**

### **Core Tables**
- `users` - User accounts and profiles
- `admin` - Admin user accounts
- `repair_services` - Available repair services
- `bicycles` - Available bicycles for rental
- `repair_requests` - User repair requests
- `rental_requests` - User rental requests
- `time_slots` - Available time slots
- `service_mechanic_charge` - Mechanic charges
- `bicycle_photos` - Bicycle images
- `repair_request_services` - Services in repair requests
- `repair_request_files` - Files attached to repair requests
- `coupons` - Discount coupons
- `coupon_usage` - Coupon usage tracking
- `promotional_cards` - Promotional content
- `otp_codes` - OTP verification codes
- `contact_settings` - Contact information
- `payment_transactions` - Payment records

## **Security Features**

### **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (Admin/User)
- OTP verification for user registration
- Secure password hashing with bcrypt

### **Rate Limiting**
- Auth routes: 100 requests per 5 minutes
- User routes: 1000 requests per hour
- General routes: 50000 requests per 15 minutes

### **Input Validation**
- Express-validator for request validation
- SQL injection prevention via Supabase client
- File upload validation and restrictions

### **Security Headers**
- Helmet.js for security headers
- CORS configuration
- Content Security Policy

## **File Upload System**

### **AWS S3 Integration**
- Pre-signed URLs for secure uploads
- File type validation
- Size limits (5MB per file)
- Automatic cleanup of temporary files

### **Supported File Types**
- Images: JPEG, PNG, GIF
- Documents: PDF, DOC, DOCX
- Maximum size: 5MB per file

## **SMS Integration**

### **Twilio Integration**
- OTP delivery via SMS
- Delivery status tracking
- Error handling and retry logic

## **Performance & Monitoring**

### **Response Times**
- Health check: < 50ms
- Simple queries: < 200ms
- Complex queries: < 500ms
- File uploads: < 2s

### **Monitoring**
- Request logging with Morgan
- Error tracking and reporting
- Performance metrics
- Database query monitoring

## **Deployment**

### **Production Setup**
```bash
# Use production environment
cp env.production.template .env.production
# Edit .env.production with production values

# Start production server
NODE_ENV=production npm start
```

### **Environment Variables**
See `env.production.template` for production configuration.

### **Process Management**
```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name cyclebees-backend
pm2 save
pm2 startup
```

## **Testing**

### **API Testing**
```bash
# Test database connection
node test-supabase-connection.js

# Test endpoints (examples)
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210"}'
```

### **Load Testing**
The application has been tested with:
- 30 concurrent requests
- 100% success rate
- Average response time: 231ms
- No memory leaks detected

## **Migration History**

### **From SQLite to Supabase**
- ✅ **Phase 1**: Setup & Preparation
- ✅ **Phase 2**: Schema Migration
- ✅ **Phase 3**: Code Migration
- ✅ **Phase 4**: Testing & Validation
- ✅ **Phase 5**: Deployment & Cleanup
- ⏳ **Phase 6**: Monitoring & Optimization

See `DATABASE_MIGRATION_PLAN.md` for detailed migration information.

## **Troubleshooting**

### **Common Issues**

#### **Database Connection Issues**
```bash
# Test Supabase connection
node test-supabase-connection.js

# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

#### **Authentication Issues**
- Verify JWT_SECRET is set
- Check token expiration
- Ensure proper role permissions

#### **File Upload Issues**
- Verify AWS credentials
- Check S3 bucket permissions
- Validate file size and type

### **Logs**
```bash
# View application logs
tail -f logs/app.log

# Check error logs
grep ERROR logs/app.log
```

## **Rollback Procedure**

If you need to rollback to SQLite, see `ROLLBACK_PROCEDURE.md` for detailed instructions.

## **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## **License**

MIT License - see LICENSE file for details.

## **Support**

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Last Updated**: July 28, 2025
**Version**: 2.3.0
**Database**: Supabase (PostgreSQL)
**Status**: Production Ready ✅ 