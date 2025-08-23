# ROTZ.AI - Image Generator

A professional AI image generation application with Firebase backend integration.

## 🚀 Features

- **AI Image Generation**: Create stunning images using advanced AI technology
- **User Authentication**: Secure login with email/password and Google OAuth
- **Cloud Storage**: Images and settings synced across devices
- **Reference Images**: Upload reference images for image-to-image generation
- **Preset Management**: Save and load generation presets
- **Image History**: View and manage your generated images
- **Batch Generation**: Generate multiple images at once
- **Professional UI**: Modern, responsive design with animations

## 🛠 Technologies

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn-ui + Tailwind CSS
- **Backend**: Firebase (Firestore, Authentication, Storage, Hosting)
- **State Management**: React Context + Custom Hooks
- **Build Tool**: Vite
- **Deployment**: Firebase Hosting

## 📦 Installation

### Prerequisites

- Node.js 18+ and npm
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project (see DEPLOYMENT.md)

### Local Development

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd artifice-spark

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase configuration

# Start development server
npm run dev
```

### Environment Configuration

Create a `.env` file with your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id-here
VITE_FIREBASE_APP_ID=your-app-id-here
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id-here
```

## 🔒 Security Features

- **Authentication Required**: Users must sign in to generate and save images
- **Data Isolation**: Users can only access their own data
- **Secure Storage Rules**: Proper file type and size validation
- **Protected API**: Firebase security rules prevent unauthorized access
- **Input Validation**: Client and server-side validation

## 🚀 Deployment

### Quick Deploy to Firebase

```bash
# Build and deploy everything
npm run firebase:deploy

# Deploy only hosting
npm run firebase:deploy:hosting

# Deploy only database rules
npm run firebase:deploy:rules
```

### Detailed Deployment Guide

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup instructions including:
- Firebase project configuration
- Security rules setup
- Custom domain configuration
- Monitoring and analytics
- Backup strategies

## 📱 Usage

1. **Sign Up/Sign In**: Create account or sign in with Google
2. **Enter Prompt**: Describe the image you want to generate
3. **Configure Settings**: Choose art style, aspect ratio, and advanced settings
4. **Upload Reference** (Optional): Add reference image for image-to-image generation
5. **Generate**: Click generate to create your image
6. **Save & Download**: Images are automatically saved to your history

## 🛡 Firebase Security Configuration

### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/reference-images/{imageId} {
      allow read, write: if request.auth != null && 
                         request.auth.uid == userId &&
                         resource.size < 10 * 1024 * 1024;
    }
  }
}
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run firebase:deploy` - Build and deploy to Firebase
- `npm run firebase:deploy:hosting` - Deploy only hosting
- `npm run firebase:deploy:rules` - Deploy only security rules

## 🏗 Architecture

```
src/
├── components/          # React components
│   ├── ui/             # shadcn-ui components
│   ├── ImageGenerator.tsx  # Main image generation component
│   ├── AuthModal.tsx   # Authentication modal
│   └── UserMenu.tsx    # User menu component
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication context
├── hooks/              # Custom React hooks
│   ├── useFirestore.ts # Firestore operations
│   └── useStorage.ts   # Firebase Storage operations
├── lib/                # Utilities
│   ├── firebase.ts     # Firebase configuration
│   └── utils.ts        # General utilities
└── pages/              # Page components
    ├── Index.tsx       # Main page
    └── NotFound.tsx    # 404 page
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [DEPLOYMENT.md](./DEPLOYMENT.md) guide
- Review Firebase Console for error logs
- Open an issue on GitHub

## 🎯 Roadmap

- [ ] Image editing capabilities
- [ ] More AI model integrations
- [ ] Social sharing features
- [ ] Advanced prompt templates
- [ ] Team collaboration features
- [ ] API access for developers
