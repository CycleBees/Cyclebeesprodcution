# CycleBees Mobile App - Technical Report

## Overview
The CycleBees Mobile App is a React Native application built with Expo for bicycle rental and repair services. It features phone-based OTP authentication, multi-step booking processes, file uploads, and real-time request tracking.

## Technology Stack
- **React Native**: 0.79.5
- **Expo**: 53.0.17
- **TypeScript**: 5.8.3
- **Expo Router**: 5.1.3 (File-based routing)
- **AsyncStorage**: 2.1.2 (Local storage)
- **Expo Image**: 2.3.2 (Optimized images)
- **React Native Reanimated**: 3.17.4 (Animations)

## Architecture

### Project Structure
```
mobile-app/
├── app/                    # Expo Router screens
├── components/             # Reusable components
│   ├── ui/                # Base UI components
│   └── [specialized]/     # Feature components
├── contexts/              # React Context providers
├── hooks/                 # Custom hooks
├── constants/             # App constants
├── config/                # Configuration
├── utils/                 # Utilities
└── assets/                # Static assets
```

### Key Components

#### UI Components (`components/ui/`)
- **Button**: 5 variants (primary, secondary, outline, ghost, danger), 3 sizes, loading states
- **Input**: 3 variants, 4 states (default, focused, error, success), icon support
- **Card**: Container component with consistent styling
- **Modal**: Overlay dialogs with multiple sizes
- **Badge**: Status indicators with color coding

#### Specialized Components
- **CachedImage**: Optimized image loading with caching and error handling
- **CachedVideo**: Video playback with caching
- **StepIndicator**: Multi-step process visualization with animations
- **AuthGuard**: Route protection and authentication checking
- **Logo**: SVG-based brand logo with theme awareness
- **FileUpload**: File selection and upload interface

#### Feature Components
- **PromotionalCard**: Dynamic promotional content display
- **RequestCard**: Rental/repair request details with status
- **BicycleCard**: Bicycle information with photo gallery
- **ServiceCard**: Repair service options with pricing

## Screens

### 1. Index (`app/index.tsx`)
- App entry point
- Authentication token checking
- Automatic routing to main app or login

### 2. Login (`app/login.tsx`)
- Phone number input and validation
- OTP generation and verification
- New user registration flow
- Multi-step authentication process

### 3. Main (`app/main.tsx`)
- Navigation hub with tab-based routing
- Screen content rendering
- Route parameter handling
- Authentication guard

### 4. Home (`app/home.tsx`)
- Dashboard with user profile
- Auto-scrolling promotional cards
- Quick action buttons
- Contact information display

### 5. Book Rental (`app/book-rental.tsx`)
- Multi-step bicycle rental booking
- Bicycle selection and details
- Duration and pricing calculation
- Coupon application and order submission

### 6. Book Repair (`app/book-repair.tsx`)
- Multi-step repair service booking
- Service selection and file uploads
- Date/time slot selection
- Real-time pricing calculation

### 7. My Requests (`app/my-requests.tsx`)
- Tabbed view for repair/rental requests
- Real-time status updates
- File previews and downloads
- Status change notifications

### 8. Profile (`app/profile.tsx`)
- User profile management
- Editable profile fields
- Theme toggle functionality
- Logout and settings

## State Management

### Context Providers
- **ThemeContext**: Global theme management (light/dark/system)
- **NavigationContext**: Navigation state with animated transitions

### Custom Hooks
- **useAppTheme**: Theme-aware styling with color palettes
- **useColorScheme**: System color scheme detection

## API Integration

### Base Configuration
```typescript
export const API_BASE_URL = 'http://192.168.0.107:3000';
```

### Key Endpoints

#### Authentication
- `POST /api/auth/send-otp` - Generate OTP
- `POST /api/auth/verify-otp` - Verify OTP and authenticate
- `POST /api/auth/register` - Register new user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

#### Rental Services
- `GET /api/rental/bicycles` - Get available bicycles
- `POST /api/rental/requests` - Create rental request
- `GET /api/rental/user/requests` - Get user's rental requests

#### Repair Services
- `GET /api/repair/services` - Get repair services
- `GET /api/repair/time-slots` - Get available time slots
- `POST /api/repair/requests` - Create repair request
- `GET /api/repair/user/requests` - Get user's repair requests

#### Additional Services
- `GET /api/promotional/cards` - Get promotional content
- `GET /api/contact/settings` - Get contact information
- `POST /api/coupon/validate` - Validate coupon codes

## Authentication System

### Flow
1. **Phone Input**: User enters phone number with validation
2. **OTP Generation**: Server generates 6-digit OTP via SMS
3. **OTP Verification**: User verifies OTP, receives JWT token
4. **Token Management**: Token stored in AsyncStorage, used for all requests

### Security Features
- Rate limiting on OTP requests
- JWT token expiration
- Server-side input validation
- Indian phone number format validation

## File Management

### Supported Formats
- **Images**: JPEG, JPG, PNG, GIF (max 50MB, 5 files)
- **Videos**: MP4, AVI, MOV, MKV (max 50MB, 1 file)

### Upload Process
- Client-side file selection and validation
- Automatic file compression
- Direct S3 upload integration
- Database metadata storage

### Caching
- **Images**: Expo Image with memory/disk caching
- **Videos**: Expo AV with progressive loading
- Configurable cache policies

## Navigation System

### Expo Router Implementation
- File-based routing in `app/` directory
- Stack navigation with authentication guards
- Type-safe parameter passing
- Animated transitions

### Navigation Context
- Current route tracking
- Transition state management
- Safe navigation with validation
- Parameter validation and fallbacks

## Theme System

### Color Palette
- **Primary**: #FFD11E (Yellow)
- **Secondary**: #2D3E50 (Dark Blue)
- **Semantic**: Success (Green), Warning (Yellow), Error (Red), Info (Blue)
- **Neutral**: Gray scale with light/dark variants

### Style System
- **Spacing**: 8px base unit with xs to xxxl scale
- **Typography**: 12px to 36px with multiple weights
- **Layout**: Border radius, shadows, z-index system
- **Platform-specific**: iOS/Android/Web adaptations

### Theme Implementation
- Context-based theme management
- System preference detection
- AsyncStorage persistence
- Dynamic component styling

## Performance Optimizations

### Image Optimization
- Memory and disk caching
- Progressive loading with placeholders
- Error handling with fallbacks
- Configurable cache policies

### Component Optimization
- React.memo for expensive components
- useCallback for event handlers
- Minimal state updates
- Hardware-accelerated animations

### Network Optimization
- API response caching
- Batch request handling
- Automatic retry logic
- File compression and chunked uploads

## Error Handling

### Strategy
- **Network Errors**: Automatic retry with user feedback
- **Validation Errors**: Real-time form validation
- **File Upload Errors**: Clear requirements and progress tracking

### User Experience
- Loading states for all operations
- Success/error message feedback
- Progress indicators
- Accessibility support

## Security

### Data Security
- Secure token storage in AsyncStorage
- Automatic token expiration handling
- Input sanitization and validation
- File type and size restrictions

### Network Security
- HTTPS communication
- API rate limiting
- Proper authentication headers
- Secure error message handling

## Development & Deployment

### Setup
- Environment-specific API configuration
- ESLint and TypeScript configuration
- React Native debugging tools

### Build Process
- Expo build system
- TypeScript compilation
- Asset optimization
- Platform-specific builds

### Distribution
- iOS App Store and Google Play Store
- Over-the-air updates via Expo
- Environment variable management

## Key Features Summary

### Core Functionality
- ✅ Phone-based OTP authentication
- ✅ Multi-step booking processes
- ✅ File upload and management
- ✅ Real-time request tracking
- ✅ Theme switching (light/dark/system)
- ✅ Responsive design

### Technical Excellence
- ✅ TypeScript for type safety
- ✅ Component-based architecture
- ✅ Context-based state management
- ✅ Optimized performance
- ✅ Comprehensive error handling
- ✅ Security best practices

### User Experience
- ✅ Intuitive navigation
- ✅ Loading states and feedback
- ✅ Accessibility support
- ✅ Offline capability
- ✅ Cross-platform compatibility

---

*Report generated: December 2024*
*CycleBees Mobile App v2.3* 