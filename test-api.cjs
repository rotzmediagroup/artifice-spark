const jwt = require('jsonwebtoken');

// Create test JWT for admin user
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';
const adminUserId = 'admin-test-id';

const token = jwt.sign({ 
  id: adminUserId, 
  email: 'jerome@rotz.host', 
  isAdmin: true 
}, JWT_SECRET, { expiresIn: '1h' });

console.log('Test Admin JWT Token:');
console.log(token);

// Test the image generation endpoint
const testImageGeneration = async () => {
  console.log('\n--- Testing Image Generation Endpoint ---');
  
  const imagePayload = {
    prompt: "A beautiful sunset over mountains",
    style: "realistic",
    steps: 30,
    cfg_scale: 7,
    width: 1024,
    height: 1024
  };

  try {
    const response = await fetch('http://localhost:3001/api/generate/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(imagePayload)
    });

    console.log('Response status:', response.status);
    const data = await response.text();
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error testing image generation:', error);
  }
};

// Test file upload endpoint
const testFileUpload = async () => {
  console.log('\n--- Testing File Upload Endpoint ---');
  
  const base64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
  
  const uploadPayload = {
    imageData: base64Image,
    contentType: 'image',
    imageId: 'test-image-' + Date.now()
  };

  try {
    const response = await fetch('http://localhost:3001/api/storage/upload-generated', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(uploadPayload)
    });

    console.log('Upload response status:', response.status);
    const data = await response.json();
    console.log('Upload response data:', data);
  } catch (error) {
    console.error('Error testing file upload:', error);
  }
};

// Run tests
testImageGeneration();
setTimeout(testFileUpload, 1000);