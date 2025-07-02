import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketProps {
  currentUser: any;
  onMessageReceived?: (data: any) => void;
  onFriendRequestReceived?: (data: any) => void;
  onUserOnline?: (data: any) => void;
  onUserOffline?: (data: any) => void;
  onOnlineUsersList?: (users: any[]) => void;
}

export const useWebSocket = ({
  currentUser,
  onMessageReceived,
  onFriendRequestReceived,
  onUserOnline,
  onUserOffline,
  onOnlineUsersList
}: UseWebSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    // Create socket connection
    const serverUrl = import.meta.env.PROD ? window.location.origin : 'http://localhost:3000';
    console.log('🔌 Connecting to WebSocket server:', serverUrl);
    
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      setIsConnected(true);
      
      // Authenticate user
      socket.emit('user-login', currentUser);
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('🔥 WebSocket connection error:', error);
      setIsConnected(false);
    });

    // User status events
    socket.on('user-online', (userData) => {
      console.log('👤 User came online:', userData.name);
      setOnlineUsers(prev => {
        const filtered = prev.filter(u => u.id !== userData.id);
        return [...filtered, userData];
      });
      onUserOnline?.(userData);
    });

    socket.on('user-offline', (data) => {
      console.log('👋 User went offline:', data.id);
      setOnlineUsers(prev => prev.filter(u => u.id !== data.id));
      onUserOffline?.(data);
    });

    socket.on('online-users-list', (users) => {
      console.log('📋 Online users list received:', users.length);
      setOnlineUsers(users);
      onOnlineUsersList?.(users);
    });

    // Message events
    socket.on('message-received', (data) => {
      console.log('💬 Message received:', data);
      onMessageReceived?.(data);
    });

    // Friend request events
    socket.on('friend-request-received', (request) => {
      console.log('💌 Friend request received:', request);
      onFriendRequestReceived?.(request);
    });

    socket.on('friend-request-sent', (data) => {
      console.log('📤 Friend request sent confirmation:', data);
    });

    socket.on('friend-request-accepted', (data) => {
      console.log('✅ Friend request accepted:', data);
    });

    socket.on('conversation-created', (data) => {
      console.log('💬 New conversation created:', data);
    });

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      if (socket.connected) {
        socket.emit('heartbeat', currentUser);
      }
    }, 30000); // Every 30 seconds

    // Cleanup
    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
    };
  }, [currentUser, onMessageReceived, onFriendRequestReceived, onUserOnline, onUserOffline, onOnlineUsersList]);

  // Helper functions
  const sendMessage = (conversationId: string, content: string, receiverId: string) => {
    if (socketRef.current?.connected) {
      console.log('📤 Sending message:', { conversationId, content: content.substring(0, 50) });
      socketRef.current.emit('send-message', {
        conversationId,
        senderId: currentUser.id,
        content,
        receiverId
      });
      return true;
    }
    console.warn('⚠️ Cannot send message: WebSocket not connected');
    return false;
  };

  const sendFriendRequest = (receiverId: string) => {
    if (socketRef.current?.connected) {
      console.log('📤 Sending friend request to:', receiverId);
      socketRef.current.emit('send-friend-request', {
        senderId: currentUser.id,
        receiverId,
        senderData: currentUser
      });
      return true;
    }
    console.warn('⚠️ Cannot send friend request: WebSocket not connected');
    return false;
  };

  const acceptFriendRequest = (requestId: string) => {
    if (socketRef.current?.connected) {
      console.log('✅ Accepting friend request:', requestId);
      socketRef.current.emit('accept-friend-request', {
        requestId,
        userId: currentUser.id
      });
      return true;
    }
    console.warn('⚠️ Cannot accept friend request: WebSocket not connected');
    return false;
  };

  const startTyping = (conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-start', {
        conversationId,
        userId: currentUser.id,
        userName: currentUser.name
      });
    }
  };

  const stopTyping = (conversationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing-stop', {
        conversationId,
        userId: currentUser.id
      });
    }
  };

  return {
    isConnected,
    onlineUsers,
    sendMessage,
    sendFriendRequest,
    acceptFriendRequest,
    startTyping,
    stopTyping,
    socket: socketRef.current
  };
};
