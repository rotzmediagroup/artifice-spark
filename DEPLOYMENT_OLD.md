# Rotz Image Generator - PostgreSQL Deployment Guide

## 🚀 Ready for Coolify Deployment

The application has been completely migrated from Firebase to PostgreSQL and is ready for production deployment on Coolify.

## Prerequisites

1. Node.js and npm installed
2. Firebase CLI installed globally: `npm install -g firebase-tools`
3. A Firebase project created at [https://console.firebase.google.com/](https://console.firebase.google.com/)
4. Firebase project name should be: `rotz-image-generator` (or update the config)

## Firebase Setup

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project named "ROTZ Image Generator"
3. Enable Google Analytics (optional)

### 2. Enable Required Services

#### Authentication
1. Go to Authentication > Sign-in method
2. Enable Email/Password provider
3. Enable Google provider (configure OAuth consent screen)

#### Firestore Database
1. Go to Firestore Database
2. Create database in production mode
3. Choose your preferred location
4. Database rules will be deployed automatically

#### Storage
1. Go to Storage
2. Get started with default settings
3. Storage rules will be deployed automatically

#### Hosting
1. Go to Hosting
2. Get started (will be configured via CLI)

### 3. Get Firebase Configuration

1. Go to Project Settings (gear icon)
2. Scroll to "Your apps" section
3. Click "Add app" > Web app
4. Register app with name "ROTZ Image Generator"
5. Copy the configuration object

### 4. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update `.env` with your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id-here
   VITE_FIREBASE_APP_ID=your-app-id-here
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id-here
   ```

## Deployment Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Initialize Firebase Project
```bash
firebase use --add
```
Select your Firebase project and give it an alias (e.g., "production").

### 4. Deploy to Firebase
```bash
# Deploy everything (hosting + rules)
npm run firebase:deploy

# Or deploy only hosting
npm run firebase:deploy:hosting

# Or deploy only database/storage rules
npm run firebase:deploy:rules
```

### 5. Set up Custom Domain (Optional)
1. Go to Firebase Hosting in the console
2. Add custom domain
3. Follow the DNS configuration instructions

## Security Configuration

### Firestore Rules
The app uses secure Firestore rules that:
- Require user authentication
- Users can only access their own data
- Proper data validation

### Storage Rules
The app uses secure Storage rules that:
- Require user authentication for uploads
- Users can only access their own reference images
- File size limit of 10MB
- Only image file types allowed

### Authentication Security
- Email/password authentication with proper validation
- Google OAuth integration
- User data is properly isolated

## Environment Variables

### Production Environment
For production deployment, set these environment variables in your hosting platform:

```env
VITE_FIREBASE_API_KEY=your-production-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-production-auth-domain
VITE_FIREBASE_PROJECT_ID=your-production-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-production-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-production-sender-id
VITE_FIREBASE_APP_ID=your-production-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-production-measurement-id
```

## Monitoring and Analytics

### Firebase Analytics
- User engagement tracking
- Performance monitoring
- Error tracking

### Security Monitoring
- Authentication logs
- Database access logs
- Storage access logs

## Backup and Recovery

### Database Backup
1. Go to Firestore > Backup/Restore
2. Set up automated backups
3. Configure retention policy

### Storage Backup
- User images are stored in Firebase Storage
- Consider implementing Cloud Storage backup

## Troubleshooting

### Common Issues

1. **Authentication not working**
   - Check if Email/Password provider is enabled
   - Verify OAuth configuration for Google sign-in
   - Check environment variables

2. **Database permissions errors**
   - Verify Firestore rules are deployed
   - Check user authentication status
   - Review browser console for errors

3. **Storage upload failures**
   - Check Storage rules are deployed
   - Verify file size limits
   - Check file type restrictions

4. **Build failures**
   - Run `npm run build` locally to test
   - Check for TypeScript errors
   - Verify all environment variables are set

### Performance Optimization

1. **Enable Firebase Performance Monitoring**
2. **Optimize images before storage**
3. **Implement proper caching strategies**
4. **Monitor Firestore read/write usage**

## Support

For additional support:
1. Check Firebase Console for error logs
2. Review browser console for client-side errors
3. Check Firestore usage and quotas
4. Monitor authentication metrics

## Post-Deployment Checklist

- [ ] Firebase project created and configured
- [ ] Authentication providers enabled
- [ ] Environment variables configured
- [ ] Security rules deployed
- [ ] Hosting deployment successful
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled
- [ ] Backup configured
- [ ] Performance monitoring enabled
- [ ] User testing completed