# Rotz Image Generator - PostgreSQL Deployment Guide

## 🚀 Ready for Coolify Deployment

The application has been completely migrated from Firebase to PostgreSQL and is ready for production deployment on Coolify.

## ✅ Completed Features

### Core Migration
- ✅ **PostgreSQL Database**: Complete migration from Firebase Firestore
- ✅ **JWT Authentication**: Google Sign-In with secure token management
- ✅ **Local File Storage**: Replaced Firebase Storage with local uploads
- ✅ **Dynamic Port Management**: Automatic port scanning to avoid conflicts
- ✅ **Complete API**: All endpoints tested and working

### Working Features
- ✅ **User Authentication**: Google OAuth with jerome@rotz.host as admin
- ✅ **Image Generation**: N8N webhook integration (agents.rotz.ai)
- ✅ **File Uploads**: Reference images and generated content storage
- ✅ **Credit System**: Dual credit system (image/video) with admin unlimited
- ✅ **Image History**: Full CRUD operations with metadata
- ✅ **Presets Management**: Save and manage generation presets
- ✅ **Database Operations**: Tested with real data

## 🐳 Deployment Configuration

### Branch: `postgresql-working`
Use this branch for Coolify deployment.

### Docker Compose Services
1. **PostgreSQL Database** (postgres:15-alpine)
2. **API Backend** (Node.js/Express)
3. **Frontend** (React/Vite with nginx)

### Environment Variables
Copy from `.env.example` and configure:
```bash
# Database
DB_PASSWORD=securepassword123
JWT_SECRET=your-production-secret

# Ports (Coolify will manage these)
FRONTEND_PORT=8888
API_PORT=3001

# Domain
DOMAIN=imaging.rotz.app
```

### Port Configuration
- **Frontend**: `${FRONTEND_PORT:-8888}` (configurable for Coolify)
- **API**: `${API_PORT:-3001}` (configurable for Coolify)
- **Database**: `${DB_PORT:-5432}` (internal)

## 🧪 Testing Completed

### API Endpoints ✅
- Authentication: Google OAuth working
- Database: User creation, image history, presets
- File uploads: Local storage working
- Credit system: Deduction and checking working

### Database Schema ✅
- Users table with admin (jerome@rotz.host)
- User profiles with credit balances
- Image history with full metadata
- Presets management
- Reference images tracking

### Authentication Flow ✅
- Google Sign-In integration
- JWT token generation and validation
- Admin privileges (unlimited credits)
- Session persistence

## 🎯 Deployment Steps for Coolify

1. **Create New Service**: Use `postgresql-working` branch
2. **Set Environment Variables**: Copy from `.env.example`
3. **Configure Domain**: `imaging.rotz.app`
4. **Deploy**: Docker Compose will handle all services
5. **Verify**: Check health endpoints and authentication

## 📊 Health Checks
- API: `http://localhost:3001/health`
- Database: Automatic PostgreSQL health check
- All services have restart policies

## 🔗 Integration Points
- **N8N Webhooks**: `https://agents.rotz.ai/webhook/...`
- **Google OAuth**: Pre-configured for `imaging.rotz.app`
- **File Storage**: `/uploads` directory with proper structure

## 🎉 Ready to Deploy!

The application is **fully functional** and **production-ready** with:
- Complete PostgreSQL migration
- Working authentication and authorization
- File upload and storage system
- Credit management system
- All CRUD operations tested
- Dynamic port configuration for Coolify

**Status**: ✅ ALL FEATURES WORKING - READY FOR DEPLOYMENT