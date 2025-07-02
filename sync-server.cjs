const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'shared-users.json');

// Middleware
app.use(cors());
app.use(express.json());

// Initialize data file if it doesn't exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        users: [],
        counter: 0
    }));
}

// Helper functions
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return { users: [], counter: 0 };
    }
}

function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

// Routes

// Get all users
app.get('/api/users', (req, res) => {
    const data = readData();
    console.log(`📋 GET /api/users - Returning ${data.users.length} users`);
    res.json(data);
});

// Add a new user
app.post('/api/users', (req, res) => {
    const userData = req.body;
    const data = readData();
    
    // Check if user already exists
    const existingUser = data.users.find(u => u.username === userData.username);
    if (existingUser) {
        console.log(`❌ POST /api/users - User ${userData.username} already exists`);
        return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Generate sequential ID
    data.counter++;
    userData.sequentialId = data.counter;
    userData.displayUsername = `#${data.counter}`;
    userData.id = userData.id || `user_${Date.now()}`;
    userData.createdAt = userData.createdAt || new Date().toISOString();
    
    // Add user
    data.users.push(userData);
    
    if (writeData(data)) {
        console.log(`✅ POST /api/users - Added user ${userData.name} (${userData.username}) - ${userData.displayUsername}`);
        res.json(userData);
    } else {
        console.log(`❌ POST /api/users - Failed to save user ${userData.username}`);
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
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Sync Server running on http://localhost:${PORT}`);
    console.log(`📁 Data file: ${DATA_FILE}`);
    console.log('🔄 Ready to sync user data between browsers!');
    
    // Show current data
    const data = readData();
    console.log(`📊 Current data: ${data.users.length} users, counter: ${data.counter}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down sync server...');
    process.exit(0);
});
