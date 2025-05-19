const jwt = require('jsonwebtoken');

// Generate a test token
const userId = '507f1f77bcf86cd799439011'; // Example user ID
const token = jwt.sign({ id: userId }, 'test-secret-key');

console.log('Test JWT token:', token); 