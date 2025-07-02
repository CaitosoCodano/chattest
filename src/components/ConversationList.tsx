
import { useState, useEffect } from 'react';
import { useChatContext } from '@/contexts/ChatContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { UserPlus, User, MessageCircle, Users, Archive, Lock, VolumeX, Check, X, MoreVertical, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/sonner';

interface ConversationListProps {
  onAddFriend: () => void;
  onShowProfile: () => void;
}

const ConversationList = ({ onAddFriend, onShowProfile }: ConversationListProps) => {
  const {
    conversations,
    users,
    currentUser,
    activeConversation,
    setActiveConversation,
    messages,
    friendRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    getConversationsByStatus,
    archiveConversation,
    unarchiveConversation,
    lockConversation,
    unlockConversation,
    muteConversation,
    unmuteConversation,
    deleteConversation,
    getAllOnlineUsers
  } = useChatContext();

  const [activeTab, setActiveTab] = useState('contacts');
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);

  // Update online users periodically
  useEffect(() => {
    const updateOnlineUsers = () => {
      const online = getAllOnlineUsers();
      setOnlineUsers(online);
    };

    updateOnlineUsers();
    const interval = setInterval(updateOnlineUsers, 3000);

    return () => clearInterval(interval);
  }, [getAllOnlineUsers]);

  const getConversationUser = (conversation: any) => {
    const otherUserId = conversation.participants.find((id: string) => id !== currentUser.id);
    return users.find(user => user.id === otherUserId);
  };

  const getLastMessage = (conversationId: string) => {
    const conversationMessages = messages[conversationId] || [];
    return conversationMessages[conversationMessages.length - 1];
  };

  const formatLastMessageTime = (timestamp: Date) => {
    return formatDistanceToNow(timestamp, {
      addSuffix: true,
      locale: ptBR
    });
  };

  const handleAcceptFriendRequest = (requestId: string) => {
    acceptFriendRequest(requestId);
    toast.success('Pedido de amizade aceito!');
  };

  const handleRejectFriendRequest = (requestId: string) => {
    rejectFriendRequest(requestId);
    toast.success('Pedido de amizade recusado.');
  };

  const handleLockConversation = () => {
    if (selectedConversation && password) {
      lockConversation(selectedConversation, password);
      setShowPasswordDialog(false);
      setPassword('');
      setSelectedConversation(null);
      toast.success('Conversa trancada com sucesso!');
    }
  };

  const handleUnlockConversation = (conversationId: string) => {
    if (password) {
      const success = unlockConversation(conversationId, password);
      if (success) {
        setShowPasswordDialog(false);
        setPassword('');
        setSelectedConversation(null);
        toast.success('Conversa destrancada!');
      } else {
        toast.error('Senha incorreta!');
      }
    }
  };

  const handleMenuAction = (action: string, conversationId: string) => {
    switch (action) {
      case 'archive':
        archiveConversation(conversationId);
        toast.success('Conversa arquivada!');
        break;
      case 'lock':
        setSelectedConversation(conversationId);
        setShowPasswordDialog(true);
        break;
      case 'mute':
        muteConversation(conversationId);
        toast.success('Conversa silenciada!');
        break;
      case 'delete':
        if (confirm('Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.')) {
          deleteConversation(conversationId);
          toast.success('Conversa excluída!');
        }
        break;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10 ring-2 ring-white">
              <AvatarFallback className="bg-white text-blue-600 font-semibold">
                {currentUser.avatar}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-white">{currentUser.name}</h2>
              <p className="text-xs text-blue-100">{currentUser.displayUsername || currentUser.username}</p>
              <button
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                className="text-xs text-blue-200 hover:text-white transition-colors"
              >
                🟢 {onlineUsers.length} usuário{onlineUsers.length !== 1 ? 's' : ''} online
              </button>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddFriend}
              className="text-white hover:bg-white/20"
            >
              <UserPlus className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShowProfile}
              className="text-white hover:bg-white/20"
            >
              <User className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Online Users List */}
      {showOnlineUsers && onlineUsers.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Usuários Online:</h4>
          <div className="space-y-1">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-blue-800">{user.name}</span>
                <span className="text-blue-600">({user.username})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 m-2">
          <TabsTrigger value="requests" className="text-xs">
            <Users className="w-3 h-3 mr-1" />
            Pedidos
            {friendRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {friendRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-xs">
            <MessageCircle className="w-3 h-3 mr-1" />
            Contatos
          </TabsTrigger>
          <TabsTrigger value="archived" className="text-xs">
            <Archive className="w-3 h-3 mr-1" />
            Arquivadas
          </TabsTrigger>
          <TabsTrigger value="locked" className="text-xs">
            <Lock className="w-3 h-3 mr-1" />
            Trancadas
          </TabsTrigger>
          <TabsTrigger value="muted" className="text-xs">
            <VolumeX className="w-3 h-3 mr-1" />
            Silenciadas
          </TabsTrigger>
        </TabsList>

        {/* Friend Requests Tab */}
        <TabsContent value="requests" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Pedidos de Amizade</h3>
              {friendRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Nenhum pedido de amizade</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendRequests.map((request) => (
                    <div key={request.id} className="bg-white border rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                              {request.senderAvatar}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">{request.senderName}</p>
                            <p className="text-sm text-gray-500">{request.senderUsername}</p>
                            <p className="text-xs text-gray-400">
                              {formatLastMessageTime(request.timestamp)}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptFriendRequest(request.id)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRejectFriendRequest(request.id)}
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Contatos</h3>
              {getConversationsByStatus('active').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Nenhuma conversa ativa</p>
                  <p className="text-xs">Adicione amigos para começar a conversar!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getConversationsByStatus('active').map((conversation) => {
                    const user = getConversationUser(conversation);
                    const lastMessage = getLastMessage(conversation.id);

                    if (!user) return null;

                    return (
                      <div
                        key={conversation.id}
                        className={`p-3 rounded-lg transition-colors ${
                          activeConversation === conversation.id
                            ? 'bg-blue-50 border-blue-200 border'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="flex items-center space-x-3 flex-1 cursor-pointer"
                            onClick={() => setActiveConversation(conversation.id)}
                          >
                            <div className="relative">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                                  {user.avatar}
                                </AvatarFallback>
                              </Avatar>
                              {user.status === 'online' && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-900 truncate">{user.name}</p>
                                {lastMessage && (
                                  <span className="text-xs text-gray-500">
                                    {formatLastMessageTime(lastMessage.timestamp)}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {lastMessage ? lastMessage.content : 'Nenhuma mensagem ainda'}
                              </p>
                            </div>
                          </div>

                          {/* Menu de três pontos */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleMenuAction('archive', conversation.id)}>
                                <Archive className="mr-2 h-4 w-4" />
                                Arquivar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMenuAction('lock', conversation.id)}>
                                <Lock className="mr-2 h-4 w-4" />
                                Trancar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleMenuAction('mute', conversation.id)}>
                                <VolumeX className="mr-2 h-4 w-4" />
                                Silenciar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleMenuAction('delete', conversation.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Archived Tab */}
        <TabsContent value="archived" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Conversas Arquivadas</h3>
              {getConversationsByStatus('archived').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Archive className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Nenhuma conversa arquivada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getConversationsByStatus('archived').map((conversation) => {
                    const user = getConversationUser(conversation);
                    if (!user) return null;

                    return (
                      <div key={conversation.id} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gray-400 text-white">
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">Arquivada</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unarchiveConversation(conversation.id)}
                          >
                            Desarquivar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Locked Tab */}
        <TabsContent value="locked" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Conversas Trancadas</h3>
              {getConversationsByStatus('locked').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Nenhuma conversa trancada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getConversationsByStatus('locked').map((conversation) => {
                    const user = getConversationUser(conversation);
                    if (!user) return null;

                    return (
                      <div key={conversation.id} className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-yellow-500 text-white">
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-yellow-600">🔒 Protegida por senha</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedConversation(conversation.id);
                              setShowPasswordDialog(true);
                            }}
                          >
                            Destrancar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Muted Tab */}
        <TabsContent value="muted" className="flex-1 m-0">
          <ScrollArea className="h-full">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Conversas Silenciadas</h3>
              {getConversationsByStatus('muted').length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <VolumeX className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm">Nenhuma conversa silenciada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getConversationsByStatus('muted').map((conversation) => {
                    const user = getConversationUser(conversation);
                    if (!user) return null;

                    return (
                      <div key={conversation.id} className="p-3 rounded-lg bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gray-400 text-white">
                                {user.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">{user.name}</p>
                              <p className="text-sm text-gray-500">🔇 Silenciada</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => unmuteConversation(conversation.id)}
                          >
                            Ativar Som
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Digite a senha</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Senha da conversa"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (selectedConversation) {
                    const conversation = conversations.find(c => c.id === selectedConversation);
                    if (conversation?.status === 'locked') {
                      handleUnlockConversation(selectedConversation);
                    } else {
                      handleLockConversation();
                    }
                  }
                }
              }}
            />
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  if (selectedConversation) {
                    const conversation = conversations.find(c => c.id === selectedConversation);
                    if (conversation?.status === 'locked') {
                      handleUnlockConversation(selectedConversation);
                    } else {
                      handleLockConversation();
                    }
                  }
                }}
                className="flex-1"
              >
                Confirmar
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowPasswordDialog(false);
                  setPassword('');
                  setSelectedConversation(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConversationList;
