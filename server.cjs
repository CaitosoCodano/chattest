const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for users (in production, you'd use a database)
let userData = {
  users: [],
  counter: 0
};

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory
app.use(express.static(path.join(process.cwd(), 'dist')));

// Helper functions
function readData() {
  return userData;
}

function writeData(data) {
  userData = data;
  return true;
}

// API Routes

// Get all users
app.get('/api/users', (req, res) => {
  const data = readData();
  console.log(`📋 GET /api/users - Returning ${data.users.length} users`);
  res.json(data);
});

// Add a new user
app.post('/api/users', (req, res) => {
  const userDataInput = req.body;
  const data = readData();
  
  // Check if user already exists
  const existingUser = data.users.find(u => u.username === userDataInput.username);
  if (existingUser) {
    console.log(`❌ POST /api/users - User ${userDataInput.username} already exists`);
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  // Generate sequential ID
  data.counter++;
  userDataInput.sequentialId = data.counter;
  userDataInput.displayUsername = `#${data.counter}`;
  userDataInput.id = userDataInput.id || `user_${Date.now()}`;
  userDataInput.createdAt = userDataInput.createdAt || new Date().toISOString();
  
  // Add user
  data.users.push(userDataInput);
  
  if (writeData(data)) {
    console.log(`✅ POST /api/users - Added user ${userDataInput.name} (${userDataInput.username}) - ${userDataInput.displayUsername}`);
    res.json(userDataInput);
  } else {
    console.log(`❌ POST /api/users - Failed to save user ${userDataInput.username}`);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// Update user data
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const updateData = req.body;
  const data = readData();
  
  const userIndex = data.users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    console.log(`❌ PUT /api/users/${userId} - User not found`);
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Update user
  data.users[userIndex] = { ...data.users[userIndex], ...updateData };
  
  if (writeData(data)) {
    console.log(`✅ PUT /api/users/${userId} - Updated user`);
    res.json(data.users[userIndex]);
  } else {
    console.log(`❌ PUT /api/users/${userId} - Failed to update user`);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete all users (for testing)
app.delete('/api/users', (req, res) => {
  const data = { users: [], counter: 0 };
  if (writeData(data)) {
    console.log('🗑️ DELETE /api/users - All users deleted');
    res.json({ message: 'All users deleted' });
  } else {
    console.log('❌ DELETE /api/users - Failed to delete users');
    res.status(500).json({ error: 'Failed to delete users' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    users: userData.users.length,
    counter: userData.counter
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🔄 Ready to sync user data between browsers!');
  
  // Show current data
  console.log(`📊 Current data: ${userData.users.length} users, counter: ${userData.counter}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});
