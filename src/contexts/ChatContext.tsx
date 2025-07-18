
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  read: boolean;
}

interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  updatedAt: Date;
  status: 'active' | 'archived' | 'locked' | 'muted';
  password?: string; // For locked conversations
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  senderName: string;
  senderUsername: string;
  senderAvatar: string;
  timestamp: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

interface ChatContextType {
  currentUser: User;
  conversations: Conversation[];
  messages: { [conversationId: string]: Message[] };
  users: User[];
  friendRequests: FriendRequest[];
  activeConversation: string | null;
  isConnected: boolean;
  sendMessage: (conversationId: string, content: string) => void;
  createConversation: (userId: string) => string;
  setActiveConversation: (id: string | null) => void;
  sendFriendRequest: (username: string) => boolean;
  acceptFriendRequest: (requestId: string) => void;
  rejectFriendRequest: (requestId: string) => void;
  searchUsers: (query: string) => User[];
  archiveConversation: (conversationId: string) => void;
  unarchiveConversation: (conversationId: string) => void;
  lockConversation: (conversationId: string, password: string) => void;
  unlockConversation: (conversationId: string, password: string) => boolean;
  muteConversation: (conversationId: string) => void;
  unmuteConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  getConversationsByStatus: (status: 'active' | 'archived' | 'locked' | 'muted') => Conversation[];
  getAllOnlineUsers: () => User[];
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode; currentUser: User }> = ({
  children,
  currentUser,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [users, setUsers] = useState<User[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);

  // WebSocket connection
  const {
    isConnected,
    onlineUsers,
    sendMessage: wsSendMessage,
    sendFriendRequest: wsSendFriendRequest,
    acceptFriendRequest: wsAcceptFriendRequest,
    startTyping,
    stopTyping
  } = useWebSocket({
    currentUser,
    onMessageReceived: (data) => {
      console.log('📨 Message received via WebSocket:', data);
      setMessages(prev => ({
        ...prev,
        [data.conversationId]: [...(prev[data.conversationId] || []), data.message]
      }));
    },
    onFriendRequestReceived: (request) => {
      console.log('💌 Friend request received via WebSocket:', request);
      setFriendRequests(prev => [...prev, request]);
    },
    onUserOnline: (userData) => {
      console.log('👤 User online via WebSocket:', userData);
    },
    onUserOffline: (data) => {
      console.log('👋 User offline via WebSocket:', data);
    },
    onOnlineUsersList: (usersList) => {
      console.log('📋 Online users list via WebSocket:', usersList);
    }
  });

  // Helper functions - declared first to avoid hoisting issues
  const getUserOnlineStatus = (userId: string): 'online' | 'offline' | 'away' => {
    const lastSeen = localStorage.getItem(`user_last_seen_${userId}`);
    if (!lastSeen) return 'offline';

    const lastSeenTime = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenTime.getTime()) / (1000 * 60);

    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'away';
    return 'offline';
  };

  const updateUserOnlineStatus = useCallback((isOnline: boolean) => {
    const timestamp = new Date().toISOString();
    localStorage.setItem(`user_last_seen_${currentUser.id}`, timestamp);
    localStorage.setItem(`user_status_${currentUser.id}`, isOnline ? 'online' : 'offline');

    // Trigger storage event for other tabs
    localStorage.setItem('user_status_update', timestamp);
  }, [currentUser.id]);

  const loadPersistedData = useCallback(() => {
    // Load conversations
    const savedConversations = localStorage.getItem(`conversations_${currentUser.id}`);
    if (savedConversations) {
      try {
        setConversations(JSON.parse(savedConversations));
      } catch (error) {
        console.error('Error loading conversations:', error);
      }
    }

    // Load messages
    const savedMessages = localStorage.getItem(`messages_${currentUser.id}`);
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    }

    // Load friends list
    const savedUsers = localStorage.getItem(`friends_${currentUser.id}`);
    if (savedUsers) {
      try {
        setUsers(JSON.parse(savedUsers));
      } catch (error) {
        console.error('Error loading friends:', error);
      }
    }

    // Load friend requests
    const savedRequests = localStorage.getItem(`friend_requests_${currentUser.id}`);
    if (savedRequests) {
      try {
        setFriendRequests(JSON.parse(savedRequests));
      } catch (error) {
        console.error('Error loading friend requests:', error);
      }
    }
  }, [currentUser.id]);

  const setupStorageSync = useCallback(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_status_update') {
        // Update online status of all users
        setUsers(prev => prev.map(user => ({
          ...user,
          status: getUserOnlineStatus(user.id)
        })));
      }
      if (e.key === 'friend_request_update') {
        // Reload friend requests
        const savedRequests = localStorage.getItem(`friend_requests_${currentUser.id}`);
        if (savedRequests) {
          try {
            setFriendRequests(JSON.parse(savedRequests));
          } catch (error) {
            console.error('Error loading friend requests:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Set up periodic status update
    const statusInterval = setInterval(() => {
      setUsers(prev => prev.map(user => ({
        ...user,
        status: getUserOnlineStatus(user.id)
      })));
    }, 5000); // Update every 5 seconds

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(statusInterval);
    };
  }, [currentUser.id]);

  // Load persisted data and set up synchronization
  useEffect(() => {
    loadPersistedData();
    const cleanup = setupStorageSync();
    updateUserOnlineStatus(true);

    // Cleanup on unmount
    return () => {
      updateUserOnlineStatus(false);
      if (cleanup) cleanup();
    };
  }, [currentUser.id, loadPersistedData, setupStorageSync, updateUserOnlineStatus]);

  // Persist data when it changes
  useEffect(() => {
    localStorage.setItem(`conversations_${currentUser.id}`, JSON.stringify(conversations));
  }, [conversations, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`messages_${currentUser.id}`, JSON.stringify(messages));
  }, [messages, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`friends_${currentUser.id}`, JSON.stringify(users));
  }, [users, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`friend_requests_${currentUser.id}`, JSON.stringify(friendRequests));
  }, [friendRequests, currentUser.id]);

  const sendMessage = (conversationId: string, content: string) => {
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;

    const receiverId = conversation.participants.find(p => p !== currentUser.id);
    if (!receiverId) return;

    // Try WebSocket first
    const wsSuccess = wsSendMessage(conversationId, content, receiverId);

    if (!wsSuccess) {
      // Fallback to localStorage for offline mode
      console.log('📱 WebSocket unavailable, using localStorage fallback');

      const newMessage: Message = {
        id: `msg_${Date.now()}`,
        senderId: currentUser.id,
        receiverId,
        content,
        timestamp: new Date(),
        type: 'text',
        read: false,
      };

      setMessages(prev => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), newMessage],
      }));

      // Update conversation last message
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, lastMessage: newMessage, updatedAt: new Date() }
            : conv
        )
      );
    }
  };

  const createConversation = (userId: string): string => {
    const existingConv = conversations.find(c =>
      c.participants.includes(userId) && c.participants.includes(currentUser.id)
    );

    if (existingConv) {
      return existingConv.id;
    }

    const newConvId = `conv_${Date.now()}`;
    const newConversation: Conversation = {
      id: newConvId,
      participants: [currentUser.id, userId],
      unreadCount: 0,
      updatedAt: new Date(),
      status: 'active',
    };

    setConversations(prev => [...prev, newConversation]);
    setMessages(prev => ({ ...prev, [newConvId]: [] }));

    return newConvId;
  };

  const getAllRegisteredUsers = () => {
    const SHARED_USERS_KEY = 'shared_registered_users_db';
    const sharedUsersData = localStorage.getItem(SHARED_USERS_KEY);

    if (sharedUsersData) {
      try {
        return JSON.parse(sharedUsersData);
      } catch (error) {
        console.error('Error parsing shared users data:', error);
        return [];
      }
    }

    return [];
  };

  const sendFriendRequest = (username: string): boolean => {
    console.log('📤 Enviando convite para username:', username);

    // Search for real registered users
    const registeredUsers = getAllRegisteredUsers();
    console.log('📋 Total de usuários registrados:', registeredUsers.length);

    // Check if user already exists in current users list
    const existingUser = users.find(u =>
      u.username === username ||
      (username.startsWith('#') && u.username === username) ||
      u.username === (username.startsWith('#') ? username : `#${username}`)
    );

    if (existingUser) {
      console.log('❌ Usuário já é amigo');
      return false; // Already friends
    }

    // Search in registered users by displayUsername, sequentialId, or username
    const foundUser = registeredUsers.find(u => {
      const matches =
        u.displayUsername === username ||
        (username.startsWith('#') && u.displayUsername === username) ||
        u.username === username ||
        (username.startsWith('#') && u.sequentialId === parseInt(username.replace('#', '')));

      console.log(`🔍 Verificando usuário ${u.name} (${u.username}/${u.displayUsername}): ${matches ? 'MATCH' : 'no match'}`);
      return matches;
    });

    console.log('👤 Usuário encontrado:', foundUser ? `${foundUser.name} (${foundUser.displayUsername})` : 'Nenhum');

    if (foundUser && foundUser.id !== currentUser.id) {
      // Check if request already exists
      const existingRequest = friendRequests.find(req =>
        req.receiverId === foundUser.id && req.senderId === currentUser.id && req.status === 'pending'
      );

      if (existingRequest) {
        console.log('❌ Convite já enviado');
        return false; // Request already sent
      }

      // Create friend request
      const newRequest: FriendRequest = {
        id: `req_${Date.now()}`,
        senderId: currentUser.id,
        receiverId: foundUser.id,
        senderName: currentUser.name,
        senderUsername: currentUser.displayUsername || currentUser.username,
        senderAvatar: currentUser.avatar,
        timestamp: new Date(),
        status: 'pending',
      };

      console.log('📝 Criando convite:', newRequest);

      // Try WebSocket first
      const wsSuccess = wsSendFriendRequest(foundUser.id);

      if (wsSuccess) {
        console.log('✅ Convite enviado via WebSocket');
        return true;
      } else {
        // Fallback to localStorage
        console.log('📱 WebSocket unavailable, using localStorage fallback');

        // Save request to both users' localStorage
        const receiverRequests = JSON.parse(localStorage.getItem(`friend_requests_${foundUser.id}`) || '[]');
        receiverRequests.push(newRequest);
        localStorage.setItem(`friend_requests_${foundUser.id}`, JSON.stringify(receiverRequests));

        // Also save to current user's sent requests for tracking
        const senderRequests = JSON.parse(localStorage.getItem(`sent_requests_${currentUser.id}`) || '[]');
        senderRequests.push(newRequest);
        localStorage.setItem(`sent_requests_${currentUser.id}`, JSON.stringify(senderRequests));

        // Trigger storage event for synchronization
        localStorage.setItem('friend_request_update', Date.now().toString());

        console.log('✅ Convite enviado via localStorage');
        return true;
      }
    }

    console.log('❌ Usuário não encontrado ou é o próprio usuário');
    return false;
  };

  const acceptFriendRequest = (requestId: string) => {
    const request = friendRequests.find(req => req.id === requestId);
    if (!request) return;

    // Add sender as friend
    const registeredUsers = getAllRegisteredUsers();
    const senderUser = registeredUsers.find(u => u.id === request.senderId);

    if (senderUser) {
      const chatUser: User = {
        id: senderUser.id,
        name: senderUser.name,
        username: senderUser.displayUsername || senderUser.username,
        avatar: senderUser.avatar || '👤',
        status: getUserOnlineStatus(senderUser.id),
      };

      setUsers(prev => [...prev, chatUser]);

      // Create conversation between users
      createConversation(senderUser.id);

      // Also add current user to sender's friends list
      const senderFriends = JSON.parse(localStorage.getItem(`friends_${request.senderId}`) || '[]');
      const currentUserForSender: User = {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.displayUsername || currentUser.username,
        avatar: currentUser.avatar,
        status: 'online',
      };

      senderFriends.push(currentUserForSender);
      localStorage.setItem(`friends_${request.senderId}`, JSON.stringify(senderFriends));
    }

    // Remove request
    setFriendRequests(prev => prev.filter(req => req.id !== requestId));

    // Trigger storage event
    localStorage.setItem('friend_request_update', Date.now().toString());
  };

  const rejectFriendRequest = (requestId: string) => {
    setFriendRequests(prev => prev.filter(req => req.id !== requestId));
    localStorage.setItem('friend_request_update', Date.now().toString());
  };

  const searchUsers = (query: string): User[] => {
    if (!query.trim()) return [];

    console.log('🔍 Buscando usuários com query:', query);

    // Get all registered users
    const registeredUsers = getAllRegisteredUsers();
    console.log('📋 Usuários registrados encontrados:', registeredUsers.length);

    // Simple search - find users that match the query
    const matchingUsers = registeredUsers
      .filter(u => {
        if (u.id === currentUser.id) return false; // Don't include current user

        const queryLower = query.toLowerCase();
        const nameMatch = u.name.toLowerCase().includes(queryLower);
        const usernameMatch = u.username.toLowerCase().includes(queryLower);
        const displayMatch = u.displayUsername && u.displayUsername.toLowerCase().includes(queryLower);
        const tagMatch = query.startsWith('#') && u.displayUsername === query;
        const sequentialMatch = query.startsWith('#') && u.sequentialId === parseInt(query.replace('#', ''));

        const matches = nameMatch || usernameMatch || displayMatch || tagMatch || sequentialMatch;
        console.log(`👤 Usuário ${u.name} (${u.displayUsername}): ${matches ? 'MATCH' : 'no match'}`);

        return matches;
      })
      .map(u => ({
        id: u.id,
        name: u.name,
        username: u.username, // Username original para envio do convite
        displayUsername: u.displayUsername, // Display username para exibição
        avatar: u.avatar || '👤',
        status: getUserOnlineStatus(u.id),
      }));

    console.log('✅ Usuários encontrados:', matchingUsers.length);
    return matchingUsers;
  };

  const getAllOnlineUsers = (): User[] => {
    console.log('🔍 Buscando usuários online...');

    // Use WebSocket online users if available
    if (isConnected && onlineUsers.length > 0) {
      console.log('🌐 Usando usuários online do WebSocket:', onlineUsers.length);
      return onlineUsers.filter(user => user.id !== currentUser.id);
    }

    // Fallback to localStorage
    console.log('📱 WebSocket não disponível, usando localStorage');
    const localOnlineUsers: User[] = [];
    const registeredUsers = getAllRegisteredUsers();

    // Check all global status keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('global_user_status_')) {
        try {
          const statusData = JSON.parse(localStorage.getItem(key) || '');
          const now = Date.now();
          const lastSeen = statusData.timestamp || 0;

          // Only include if user is online and not current user
          if (now - lastSeen <= 10000 && statusData.id !== currentUser.id) {
            // Get full user data from registered users
            const fullUserData = registeredUsers.find(u => u.id === statusData.id);

            if (fullUserData) {
              localOnlineUsers.push({
                id: fullUserData.id,
                name: fullUserData.name,
                username: fullUserData.username,
                displayUsername: fullUserData.displayUsername,
                avatar: fullUserData.avatar || '👤',
                status: 'online'
              });
            } else {
              // Fallback to status data
              localOnlineUsers.push({
                id: statusData.id,
                name: statusData.name,
                username: statusData.username,
                avatar: statusData.avatar || '👤',
                status: 'online'
              });
            }
          }
        } catch (error) {
          console.error('Error parsing online user status:', error);
        }
      }
    }

    console.log('👥 Usuários online encontrados (localStorage):', localOnlineUsers.length);
    return localOnlineUsers;
  };

  // Conversation management functions
  const getConversationsByStatus = (status: 'active' | 'archived' | 'locked' | 'muted'): Conversation[] => {
    return conversations.filter(conv => conv.status === status);
  };

  const archiveConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, status: 'archived' } : conv
      )
    );
  };

  const unarchiveConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, status: 'active' } : conv
      )
    );
  };

  const lockConversation = (conversationId: string, password: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, status: 'locked', password } : conv
      )
    );
  };

  const unlockConversation = (conversationId: string, password: string): boolean => {
    const conversation = conversations.find(conv => conv.id === conversationId);
    if (conversation && conversation.password === password) {
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId ? { ...conv, status: 'active', password: undefined } : conv
        )
      );
      return true;
    }
    return false;
  };

  const muteConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, status: 'muted' } : conv
      )
    );
  };

  const unmuteConversation = (conversationId: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId ? { ...conv, status: 'active' } : conv
      )
    );
  };

  const deleteConversation = (conversationId: string) => {
    // Remove conversation
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));

    // Remove messages
    setMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[conversationId];
      return newMessages;
    });

    // Clear active conversation if it's the one being deleted
    if (activeConversation === conversationId) {
      setActiveConversation(null);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        currentUser,
        conversations,
        messages,
        users,
        friendRequests,
        activeConversation,
        isConnected,
        sendMessage,
        createConversation,
        setActiveConversation,
        sendFriendRequest,
        acceptFriendRequest,
        rejectFriendRequest,
        searchUsers,
        archiveConversation,
        unarchiveConversation,
        lockConversation,
        unlockConversation,
        muteConversation,
        unmuteConversation,
        deleteConversation,
        getConversationsByStatus,
        getAllOnlineUsers,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
