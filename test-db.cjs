const jwt = require('jsonwebtoken');

// Create test JWT for admin user
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

// First, let's get the actual user ID from the database
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/database.sqlite');

db.get("SELECT id FROM users WHERE email = ?", ['jerome@rotz.host'], (err, row) => {
  if (err) {
    console.error('Database error:', err);
    return;
  }
  
  const adminUserId = row.id;
  console.log('Admin User ID:', adminUserId);
  
  const token = jwt.sign({ 
    id: adminUserId, 
    email: 'jerome@rotz.host', 
    isAdmin: true 
  }, JWT_SECRET, { expiresIn: '1h' });

  console.log('Test Admin JWT Token:');
  console.log(token);

  // Test adding image to history
  const testImageHistory = async () => {
    console.log('\n--- Testing Image History Addition ---');
    
    const imageData = {
      url: '/uploads/generated-content/test-image-1757227646623.png',
      prompt: 'Test image generation prompt',
      style: 'realistic',
      timestamp: new Date().toISOString(),
      liked: false,
      contentType: 'image',
      fileExtension: '.png',
      settings: {
        steps: 30,
        cfgScale: 7,
        aspectRatio: 'Square (1:1)',
        negativePrompt: '',
        width: 1024,
        height: 1024,
        isCustomDimensions: false,
        totalPixels: 1048576,
        megapixels: 1.05
      },
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      extensionCount: 0
    };

    try {
      const response = await fetch(`http://localhost:3001/api/users/${adminUserId}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(imageData)
      });

      console.log('Add image response status:', response.status);
      const data = await response.json();
      console.log('Add image response:', data);
    } catch (error) {
      console.error('Error adding image:', error);
    }
  };

  // Test retrieving image history
  const testGetImageHistory = async () => {
    console.log('\n--- Testing Image History Retrieval ---');
    
    try {
      const response = await fetch(`http://localhost:3001/api/users/${adminUserId}/images`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Get images response status:', response.status);
      const data = await response.json();
      console.log('Images count:', data.length);
      if (data.length > 0) {
        console.log('Sample image:', JSON.stringify(data[0], null, 2));
      }
    } catch (error) {
      console.error('Error retrieving images:', error);
    }
  };

  // Test credits system
  const testCreditsSystem = async () => {
    console.log('\n--- Testing Credits System ---');
    
    try {
      const response = await fetch(`http://localhost:3001/api/users/${adminUserId}/credits/deduct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          credit_type: 'image',
          amount: 1,
          reason: 'Test image generation'
        })
      });

      console.log('Credits deduct response status:', response.status);
      const data = await response.json();
      console.log('Credits deduct response:', data);
    } catch (error) {
      console.error('Error testing credits:', error);
    }
  };

  // Run tests sequentially
  testImageHistory()
    .then(() => testGetImageHistory())
    .then(() => testCreditsSystem())
    .then(() => {
      console.log('\n--- All API tests completed ---');
      db.close();
    });
});