# CycleBees MVP Deployment Guide

This guide will help you deploy the CycleBees MVP to Vercel quickly and efficiently.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Supabase Account**: For the database (already configured)
4. **AWS S3 Account**: For file storage
5. **Twilio Account**: For SMS OTP (optional for MVP)

## Step 1: Prepare Your Repository

1. **Commit all changes** to your GitHub repository:
```bash
git add .
git commit -m "Prepare for MVP deployment"
git push origin main
```

## Step 2: Deploy Backend API

1. **Go to Vercel Dashboard** and click "New Project"
2. **Import your GitHub repository**
3. **Configure the project:**
   - Framework Preset: `Other`
   - Root Directory: `backend`
   - Build Command: `npm install` (leave empty if auto-detected)
   - Output Directory: Leave empty
   - Install Command: `npm install`

4. **Add Environment Variables** in Vercel project settings:

### Required Environment Variables:
```bash
# Database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT
JWT_SECRET=your-super-secret-jwt-key-min-32-characters
JWT_EXPIRES_IN=24h

# AWS S3 (Optional for MVP - you can use placeholder values)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name

# Twilio (Optional for MVP - you can use placeholder values)
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number

# Production Settings
NODE_ENV=production
```

5. **Deploy** - Vercel will build and deploy your backend
6. **Copy the deployment URL** (e.g., `https://your-backend.vercel.app`)

## Step 3: Deploy Admin Dashboard

1. **Create a new Vercel project** for the admin dashboard
2. **Configure the project:**
   - Framework Preset: `Create React App`
   - Root Directory: `admin-dashboard`
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

3. **Add Environment Variables:**
```bash
REACT_APP_API_URL=https://your-backend.vercel.app
```

4. **Deploy** the admin dashboard
5. **Copy the deployment URL** (e.g., `https://your-admin.vercel.app`)

## Step 4: Update CORS Configuration

1. **Go to your backend Vercel project**
2. **Update environment variables** to include your actual domains:
   - Add your admin dashboard URL to the CORS origins
   - Update the server.js CORS configuration with your actual URLs

## Step 5: Set Up Database (Supabase)

1. **Go to your Supabase project**
2. **Run the database schema:**
   - Go to SQL Editor
   - Copy the content from `backend/database/supabase-schema.sql`
   - Execute the SQL to create all tables

3. **Insert sample data** (optional):
   - Add some repair services
   - Add time slots
   - Add a bicycle for rental testing

## Step 6: Test Your MVP

### Test Backend API Deployment:

#### 1. Basic Health Check:
```bash
# Replace 'your-backend.vercel.app' with your actual deployment URL
curl https://your-backend.vercel.app/health
```
**Expected Response:**
```json
{
  "status": "ok",
  "message": "Cycle-Bees backend is running."
}
```

#### 2. Test Database Connection:
```bash
# Test Supabase connection via contact endpoint
curl https://your-backend.vercel.app/api/contact
```
**Expected Response:**
```json
{
  "success": true,
  "data": []
}
```

#### 3. Test Authentication Endpoint:
```bash
# Test OTP send endpoint (will return validation error but shows endpoint works)
curl -X POST https://your-backend.vercel.app/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"1234567890"}'
```
**Expected Response:**
```json
{
  "success": false,
  "message": "Phone number must be exactly 10 digits and start with 6-9"
}
```

#### 4. Test Service Endpoints:
```bash
# Test repair services
curl https://your-backend.vercel.app/api/repair/services

# Test time slots
curl https://your-backend.vercel.app/api/repair/time-slots

# Test promotional cards
curl https://your-backend.vercel.app/api/promotional/cards
```

#### 5. Check Vercel Function Logs:
1. Go to your Vercel dashboard
2. Click on your backend project
3. Go to "Functions" tab
4. Click on any function to see logs
5. Look for connection messages like "✅ Connected to Supabase database"

### Troubleshooting Backend Issues:

#### If Health Check Fails:
- Check Vercel deployment logs
- Verify vercel.json configuration
- Ensure all dependencies are installed

#### If Database Connection Fails:
- Verify Supabase environment variables are set correctly
- Check Supabase project is active
- Ensure database schema has been applied

#### If Authentication Fails:
- Verify JWT_SECRET is set and strong
- Check that phone validation is working

### Using Browser for Testing:
You can also test these endpoints directly in your browser:
- `https://your-backend.vercel.app/health`
- `https://your-backend.vercel.app/api/contact`
- `https://your-backend.vercel.app/api/repair/services`
- `https://your-backend.vercel.app/api/promotional/cards`

### Test Admin Dashboard:
1. Visit `https://your-admin.vercel.app`
2. Try logging in with admin credentials
3. Test CRUD operations

### Test Mobile App:
1. Update the API URL in `mobile-app/config/api.ts` with your backend URL
2. Test with Expo Go or build a development build

## Step 7: Configure Mobile App for Production

For mobile app deployment, you'll need:

1. **Update API configuration:**
   - Ensure the production API URL is correct
   - Test the app with the deployed backend

2. **Build for production:**
   ```bash
   cd mobile-app
   npx eas build --platform all
   ```

## Quick Environment Setup Commands

### Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Sample environment values for MVP testing:
```bash
# You can use these placeholder values for AWS S3 if not implementing file upload initially
AWS_ACCESS_KEY_ID=placeholder
AWS_SECRET_ACCESS_KEY=placeholder
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=placeholder

# You can use these placeholder values for Twilio if not implementing SMS initially
TWILIO_ACCOUNT_SID=placeholder
TWILIO_AUTH_TOKEN=placeholder
TWILIO_PHONE_NUMBER=placeholder
```

## Common Issues and Solutions

### 1. CORS Errors
- Make sure your admin dashboard URL is added to the CORS origins in server.js
- Check that environment variables are set correctly

### 2. Database Connection Issues
- Verify Supabase credentials are correct
- Ensure the database schema has been applied

### 3. File Upload Issues (if implementing)
- Check AWS S3 credentials
- Verify bucket permissions

### 4. Authentication Issues
- Ensure JWT_SECRET is set and is at least 32 characters
- Check that the admin user exists in the database

## Post-Deployment Checklist

- [ ] Backend API health check passes
- [ ] Admin dashboard loads and authenticates
- [ ] Database connections work
- [ ] Mobile app connects to production API
- [ ] Basic CRUD operations work
- [ ] File uploads work (if implemented)
- [ ] SMS OTP works (if implemented)

## Security Notes for MVP

While this is an MVP deployment, be aware of these security considerations:

1. **Change default admin password** immediately after first login
2. **Use strong JWT secrets** (generated randomly)
3. **Limit CORS origins** to your actual domains
4. **Monitor logs** for any security issues

## Next Steps After MVP

1. Set up proper monitoring (Sentry, LogRocket)
2. Implement proper file upload with AWS S3
3. Set up SMS OTP with Twilio
4. Add comprehensive error handling
5. Implement proper logging
6. Set up CI/CD pipeline
7. Add comprehensive tests

## Support

If you encounter issues during deployment:

1. Check Vercel deployment logs
2. Check browser console for frontend errors
3. Test API endpoints individually
4. Verify environment variables are set correctly

Your MVP should now be deployed and functional! 🚀