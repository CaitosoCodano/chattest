
import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Load persisted data and set up synchronization
  useEffect(() => {
    loadPersistedData();
    setupStorageSync();
    updateUserOnlineStatus(true);

    // Cleanup on unmount
    return () => {
      updateUserOnlineStatus(false);
    };
  }, [currentUser.id, loadPersistedData, setupStorageSync, updateUserOnlineStatus]);

  const loadPersistedData = () => {
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
  };

  const setupStorageSync = () => {
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
  };

  const updateUserOnlineStatus = (isOnline: boolean) => {
    const statusKey = `user_status_${currentUser.id}`;
    const globalStatusKey = `global_user_status_${currentUser.id}`;

    if (isOnline) {
      const statusData = {
        id: currentUser.id,
        name: currentUser.name,
        username: currentUser.displayUsername || currentUser.username,
        avatar: currentUser.avatar,
        status: 'online',
        lastSeen: new Date().toISOString(),
        timestamp: Date.now()
      };

      localStorage.setItem(statusKey, JSON.stringify(statusData));
      localStorage.setItem(globalStatusKey, JSON.stringify(statusData));

      // Set up heartbeat to keep status alive
      const heartbeat = setInterval(() => {
        const updatedStatus = {
          ...statusData,
          timestamp: Date.now()
        };
        localStorage.setItem(statusKey, JSON.stringify(updatedStatus));
        localStorage.setItem(globalStatusKey, JSON.stringify(updatedStatus));
        localStorage.setItem('user_status_update', Date.now().toString());
      }, 3000); // Update every 3 seconds

      // Store heartbeat interval for cleanup
      (window as Record<string, unknown>).statusHeartbeat = heartbeat;
    } else {
      localStorage.removeItem(statusKey);
      localStorage.removeItem(globalStatusKey);

      // Clear heartbeat
      if ((window as Record<string, unknown>).statusHeartbeat) {
        clearInterval((window as Record<string, unknown>).statusHeartbeat as number);
      }
    }

    // Trigger storage event for other tabs/browsers
    localStorage.setItem('user_status_update', Date.now().toString());
  };

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
    // Search for real registered users
    const registeredUsers = getAllRegisteredUsers();

    // Check if user already exists in current users list
    const existingUser = users.find(u =>
      u.username === username ||
      (username.startsWith('#') && u.username === username)
    );

    if (existingUser) {
      return false; // Already friends
    }

    // Search in registered users by displayUsername, sequentialId, or username
    const foundUser = registeredUsers.find(u =>
      u.displayUsername === username ||
      (username.startsWith('#') && u.displayUsername === username) ||
      u.username === username ||
      (username.startsWith('#') && u.sequentialId === parseInt(username.replace('#', '')))
    );

    if (foundUser && foundUser.id !== currentUser.id) {
      // Check if request already exists
      const existingRequest = friendRequests.find(req =>
        req.receiverId === foundUser.id && req.senderId === currentUser.id && req.status === 'pending'
      );

      if (existingRequest) {
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

      // Save request to both users' localStorage
      const receiverRequests = JSON.parse(localStorage.getItem(`friend_requests_${foundUser.id}`) || '[]');
      receiverRequests.push(newRequest);
      localStorage.setItem(`friend_requests_${foundUser.id}`, JSON.stringify(receiverRequests));

      // Trigger storage event for synchronization
      localStorage.setItem('friend_request_update', Date.now().toString());

      return true;
    }

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

  const getUserOnlineStatus = (userId: string): 'online' | 'offline' => {
    const statusKey = `user_status_${userId}`;
    const globalStatusKey = `global_user_status_${userId}`;

    // Check both local and global status
    const statusData = localStorage.getItem(statusKey) || localStorage.getItem(globalStatusKey);

    if (!statusData) return 'offline';

    try {
      const status = JSON.parse(statusData);
      const now = Date.now();
      const lastSeen = status.timestamp || 0;

      // Consider user offline if no heartbeat for more than 10 seconds
      if (now - lastSeen > 10000) {
        // Clean up old status
        localStorage.removeItem(statusKey);
        localStorage.removeItem(globalStatusKey);
        return 'offline';
      }

      return 'online';
    } catch (error) {
      return 'offline';
    }
  };

  const searchUsers = (query: string): User[] => {
    if (!query.trim()) return [];

    // Get all registered users
    const registeredUsers = getAllRegisteredUsers();

    // Simple search - find users that match the query
    const matchingUsers = registeredUsers
      .filter(u => {
        if (u.id === currentUser.id) return false; // Don't include current user

        const queryLower = query.toLowerCase();
        const nameMatch = u.name.toLowerCase().includes(queryLower);
        const usernameMatch = u.username.toLowerCase().includes(queryLower);
        const displayMatch = u.displayUsername && u.displayUsername.toLowerCase().includes(queryLower);
        const tagMatch = query.startsWith('#') && u.displayUsername === query;

        return nameMatch || usernameMatch || displayMatch || tagMatch;
      })
      .map(u => ({
        id: u.id,
        name: u.name,
        username: u.displayUsername || u.username,
        avatar: u.avatar || '👤',
        status: getUserOnlineStatus(u.id),
      }));

    return matchingUsers;
  };

  const getAllOnlineUsers = (): User[] => {
    const onlineUsers: User[] = [];

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
            onlineUsers.push({
              id: statusData.id,
              name: statusData.name,
              username: statusData.username,
              avatar: statusData.avatar,
              status: 'online'
            });
          }
        } catch (error) {
          console.error('Error parsing online user status:', error);
        }
      }
    }

    return onlineUsers;
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
