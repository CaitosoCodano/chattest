const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// In-memory storage for production
let globalData = {
  users: [],
  counter: 0,
  onlineUsers: new Map(), // userId -> socketId
  conversations: new Map(), // conversationId -> conversation data
  messages: new Map(), // conversationId -> messages array
  friendRequests: new Map() // userId -> friend requests array
};

console.log('🚀 Initializing WebSocket Chat Server...');

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`👤 User connected: ${socket.id}`);

  // User authentication and registration
  socket.on('user-login', (userData) => {
    console.log(`🔐 User login: ${userData.name} (${userData.displayUsername})`);
    
    // Add to online users
    globalData.onlineUsers.set(userData.id, {
      socketId: socket.id,
      userData: userData,
      lastSeen: Date.now()
    });

    // Join user to their personal room
    socket.join(`user_${userData.id}`);
    
    // Broadcast user online status
    socket.broadcast.emit('user-online', {
      id: userData.id,
      name: userData.name,
      username: userData.displayUsername || userData.username,
      avatar: userData.avatar,
      status: 'online'
    });

    // Send current online users to the new user
    const onlineUsersList = Array.from(globalData.onlineUsers.values())
      .filter(user => user.userData.id !== userData.id)
      .map(user => ({
        id: user.userData.id,
        name: user.userData.name,
        username: user.userData.displayUsername || user.userData.username,
        avatar: user.userData.avatar,
        status: 'online'
      }));

    socket.emit('online-users-list', onlineUsersList);

    // Send pending friend requests
    const userRequests = globalData.friendRequests.get(userData.id) || [];
    socket.emit('friend-requests-update', userRequests);
  });

  // Handle friend request sending
  socket.on('send-friend-request', (data) => {
    const { senderId, receiverId, senderData } = data;
    console.log(`💌 Friend request: ${senderData.name} -> ${receiverId}`);

    const friendRequest = {
      id: `req_${Date.now()}_${Math.random()}`,
      senderId: senderId,
      receiverId: receiverId,
      senderName: senderData.name,
      senderUsername: senderData.displayUsername || senderData.username,
      senderAvatar: senderData.avatar,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Add to receiver's friend requests
    if (!globalData.friendRequests.has(receiverId)) {
      globalData.friendRequests.set(receiverId, []);
    }
    globalData.friendRequests.get(receiverId).push(friendRequest);

    // Notify receiver if online
    io.to(`user_${receiverId}`).emit('friend-request-received', friendRequest);
    
    // Confirm to sender
    socket.emit('friend-request-sent', { success: true, receiverId });
  });

  // Handle friend request acceptance
  socket.on('accept-friend-request', (data) => {
    const { requestId, userId } = data;
    console.log(`✅ Friend request accepted: ${requestId}`);

    const userRequests = globalData.friendRequests.get(userId) || [];
    const requestIndex = userRequests.findIndex(req => req.id === requestId);
    
    if (requestIndex !== -1) {
      const request = userRequests[requestIndex];
      userRequests.splice(requestIndex, 1);

      // Create conversation between users
      const conversationId = `conv_${Date.now()}_${request.senderId}_${userId}`;
      const conversation = {
        id: conversationId,
        participants: [request.senderId, userId],
        createdAt: new Date().toISOString(),
        lastMessage: null,
        unreadCount: 0
      };

      globalData.conversations.set(conversationId, conversation);
      globalData.messages.set(conversationId, []);

      // Notify both users
      io.to(`user_${request.senderId}`).emit('friend-request-accepted', {
        conversationId,
        friendData: {
          id: userId,
          name: 'Friend', // Will be updated with real data
          username: 'friend'
        }
      });

      io.to(`user_${userId}`).emit('conversation-created', {
        conversationId,
        friendData: {
          id: request.senderId,
          name: request.senderName,
          username: request.senderUsername
        }
      });

      // Update friend requests
      io.to(`user_${userId}`).emit('friend-requests-update', userRequests);
    }
  });

  // Handle message sending
  socket.on('send-message', (data) => {
    const { conversationId, senderId, content, receiverId } = data;
    console.log(`💬 Message in ${conversationId}: ${content.substring(0, 50)}...`);

    const message = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: senderId,
      receiverId: receiverId,
      content: content,
      timestamp: new Date().toISOString(),
      type: 'text',
      read: false
    };

    // Store message
    if (!globalData.messages.has(conversationId)) {
      globalData.messages.set(conversationId, []);
    }
    globalData.messages.get(conversationId).push(message);

    // Update conversation
    if (globalData.conversations.has(conversationId)) {
      const conversation = globalData.conversations.get(conversationId);
      conversation.lastMessage = message;
      conversation.updatedAt = new Date().toISOString();
    }

    // Send to all participants
    const conversation = globalData.conversations.get(conversationId);
    if (conversation) {
      conversation.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('message-received', {
          conversationId,
          message
        });
      });
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { conversationId, userId, userName } = data;
    socket.to(`conv_${conversationId}`).emit('user-typing', { userId, userName });
  });

  socket.on('typing-stop', (data) => {
    const { conversationId, userId } = data;
    socket.to(`conv_${conversationId}`).emit('user-stopped-typing', { userId });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`👋 User disconnected: ${socket.id}`);
    
    // Find and remove user from online users
    let disconnectedUserId = null;
    for (const [userId, userInfo] of globalData.onlineUsers.entries()) {
      if (userInfo.socketId === socket.id) {
        disconnectedUserId = userId;
        globalData.onlineUsers.delete(userId);
        break;
      }
    }

    // Broadcast user offline status
    if (disconnectedUserId) {
      socket.broadcast.emit('user-offline', { id: disconnectedUserId });
    }
  });

  // Heartbeat to keep connection alive
  socket.on('heartbeat', (userData) => {
    if (globalData.onlineUsers.has(userData.id)) {
      globalData.onlineUsers.get(userData.id).lastSeen = Date.now();
    }
  });
});

// API Routes for user management
app.get('/api/users', (req, res) => {
  res.json({
    users: globalData.users,
    counter: globalData.counter
  });
});

app.post('/api/users', (req, res) => {
  const userData = req.body;
  
  // Check if user already exists
  const existingUser = globalData.users.find(u => u.username === userData.username);
  if (existingUser) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  // Generate sequential ID
  globalData.counter++;
  userData.sequentialId = globalData.counter;
  userData.displayUsername = `#${globalData.counter}`;
  userData.id = userData.id || `user_${Date.now()}`;
  userData.createdAt = userData.createdAt || new Date().toISOString();
  
  // Add user
  globalData.users.push(userData);
  
  console.log(`✅ New user registered: ${userData.name} (${userData.displayUsername})`);
  res.json(userData);
});

app.delete('/api/users', (req, res) => {
  globalData.users = [];
  globalData.counter = 0;
  console.log('🗑️ All users deleted');
  res.json({ message: 'All users deleted' });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    onlineUsers: globalData.onlineUsers.size,
    totalUsers: globalData.users.length,
    conversations: globalData.conversations.size
  });
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 WebSocket Chat Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🔄 Real-time chat ready!');
  console.log(`📊 Initial data: ${globalData.users.length} users`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  io.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  io.close();
  server.close();
  process.exit(0);
});
