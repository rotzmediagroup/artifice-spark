# Coolify Deployment Guide

This document outlines how to deploy the ROTZ Image Generator with PostgreSQL on Coolify.

## Overview

This version uses:
- **PostgreSQL** for database (instead of Firestore)
- **Express.js API** for database operations only
- **All original Firebase services** are preserved:
  - Firebase Auth for authentication
  - Firebase Storage for file uploads
  - Firebase Cloud Functions for image generation workflows
  - All N8N webhook integrations remain unchanged

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Server     │    │   PostgreSQL    │
│   (React/Vite)  │───▶│   (Express.js)   │───▶│   Database      │
│   Port 8080     │    │   Port 3001      │    │   Port 5432     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
│
│ Firebase Services (unchanged):
├─ Firebase Auth
├─ Firebase Storage  
├─ Firebase Cloud Functions
└─ N8N Webhooks (agents.rotz.ai)
```

## Deployment Steps

### 1. Prerequisites

- Coolify instance set up
- Docker and Docker Compose support

### 2. Environment Variables

Set these in your Coolify environment:

```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=rotz_image_generator
DB_USER=postgres
DB_PASSWORD=your_secure_password

# API Configuration
PORT=3001

# Frontend Configuration
NODE_ENV=production
```

### 3. Firebase Configuration

Keep your existing Firebase configuration file (`src/lib/firebase.ts`) unchanged. All Firebase services continue to work exactly as before.

### 4. Deploy with Docker Compose

The `docker-compose.yml` file includes:

- **PostgreSQL database** with automatic schema initialization
- **API server** for database operations
- **Frontend** served via Nginx with API proxying

### 5. Database Schema

The PostgreSQL schema (`database/schema.sql`) automatically creates all necessary tables that mirror the original Firestore collections:

- `user_profiles` (userProfiles collection)
- `image_history` (users/{uid}/imageHistory subcollection)
- `presets` (users/{uid}/presets subcollection)  
- `totp_settings` (totpSettings collection)
- `credit_transactions` (creditTransactions collection)

## What Changed

### Database Layer Only
- `useFirestore.ts` - Now calls PostgreSQL API instead of Firestore
- `useCredits.ts` - Now calls PostgreSQL API instead of Firestore  
- `useTOTP.ts` - Now calls PostgreSQL API instead of Firestore

### What Stayed the Same
- All Firebase Authentication (`AuthContext.tsx`)
- All Firebase Storage (`useStorage.ts`)
- All Firebase Cloud Functions
- All N8N webhook integrations in `ImageGenerator.tsx`
- All webhook payloads and response handling
- All UI components and user experience
- All image generation workflows

## API Endpoints

The minimal API server provides these endpoints:

### User Profiles
- `GET /api/users/:userId/profile` - Get user profile
- `POST /api/users/:userId/profile` - Create/update user profile

### Image History  
- `GET /api/users/:userId/images` - Get user's image history
- `POST /api/users/:userId/images` - Add image to history
- `PUT /api/users/:userId/images/:imageId` - Update image
- `DELETE /api/users/:userId/images/:imageId` - Delete image

### Presets
- `GET /api/users/:userId/presets` - Get user's presets
- `POST /api/users/:userId/presets` - Add preset
- `PUT /api/users/:userId/presets/:presetId` - Update preset
- `DELETE /api/users/:userId/presets/:presetId` - Delete preset

### TOTP Settings
- `GET /api/users/:userId/totp` - Get TOTP settings
- `POST /api/users/:userId/totp` - Create/update TOTP settings
- `PUT /api/users/:userId/totp` - Update TOTP settings

### Credit Transactions
- `GET /api/users/:userId/credits` - Get credit transactions
- `POST /api/users/:userId/credits` - Add credit transaction

## Verification

After deployment, verify:

1. **Database connectivity** - Check API health endpoint
2. **Firebase services** - Test authentication and file uploads
3. **Image generation** - Ensure webhooks to N8N work unchanged
4. **Data persistence** - Verify image history and presets save correctly
5. **MFA functionality** - Test TOTP setup and backup codes

## Troubleshooting

### Database Issues
- Check PostgreSQL logs: `docker-compose logs postgres`
- Verify schema initialization: `docker-compose exec postgres psql -U postgres -d rotz_image_generator -c "\dt"`

### API Issues  
- Check API logs: `docker-compose logs api`
- Test health endpoint: `curl http://localhost:3001/health`

### Frontend Issues
- Check frontend logs: `docker-compose logs frontend`
- Verify Nginx configuration: `docker-compose exec frontend nginx -t`

### Firebase Issues
If Firebase services don't work, the issue is likely in the original configuration, not the PostgreSQL migration.

## Migration Notes

Existing users will automatically have their localStorage data migrated to PostgreSQL on first use. The migration function in `useFirestore.ts` handles this transparently.