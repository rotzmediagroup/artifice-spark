# Firebase Storage CORS Configuration

## Overview
The `cors.json` file has been created to enable cross-origin downloads from Firebase Storage. This resolves the "Network error during download" issues.

## How to Apply CORS Configuration

### Option 1: Using Google Cloud Console (Web Interface)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project: `rotz-image-generator`
3. Navigate to Cloud Storage > Buckets
4. Find your bucket: `rotz-image-generator.appspot.com`
5. Click on the bucket name
6. Go to the "Configuration" tab
7. Click "Edit CORS configuration"
8. Paste the contents of `cors.json`
9. Save

### Option 2: Using gsutil Command Line
If you have Google Cloud SDK installed:

```bash
# Apply CORS configuration
gsutil cors set cors.json gs://rotz-image-generator.appspot.com

# Verify CORS configuration
gsutil cors get gs://rotz-image-generator.appspot.com
```

### Option 3: Install Google Cloud SDK First
```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash

# Restart shell
exec -l $SHELL

# Initialize gcloud
gcloud init

# Apply CORS configuration
gsutil cors set cors.json gs://rotz-image-generator.appspot.com
```

## CORS Configuration Details
The `cors.json` file allows:
- Origins: All origins (`*`)
- Methods: GET and HEAD requests
- Max Age: 3600 seconds (1 hour cache)
- Response Headers: Content-Type, Content-Length, Accept-Ranges, Content-Range

## Verification
After applying CORS:
1. Test download buttons on the live site
2. Check browser console for CORS errors
3. Downloads should work without "Network error" messages

## Note
The download function has been updated with fallback methods:
1. Primary: Direct fetch without CORS mode
2. Fallback: Open in new tab for browser download
3. Last resort: Copy URL to clipboard

Even without CORS configuration applied, the fallback methods should work.