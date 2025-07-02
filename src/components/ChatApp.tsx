
import { useState } from 'react';
import ConversationList from '@/components/ConversationList';
import ChatWindow from '@/components/ChatWindow';
import AddFriendModal from '@/components/AddFriendModal';
import UserProfile from '@/components/UserProfile';
import { useChatContext } from '@/contexts/ChatContext';

interface ChatAppProps {
  currentUser: any;
  onLogout: () => void;
}

const ChatApp = ({ currentUser, onLogout }: ChatAppProps) => {
  const { activeConversation } = useChatContext();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-lg">
        <ConversationList 
          onAddFriend={() => setShowAddFriend(true)}
          onShowProfile={() => setShowProfile(true)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <ChatWindow />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
            <div className="text-center space-y-4">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-4xl">💬</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-700">Bem-vindo ao ChatApp!</h2>
              <p className="text-gray-500 max-w-md">
                Selecione uma conversa para começar a enviar mensagens ou adicione novos amigos
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddFriendModal 
        open={showAddFriend} 
        onClose={() => setShowAddFriend(false)} 
      />
      
      <UserProfile 
        user={currentUser}
        open={showProfile} 
        onClose={() => setShowProfile(false)}
        onLogout={onLogout}
      />
    </div>
  );
};

export default ChatApp;
