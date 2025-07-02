
import { useState, useEffect, useCallback } from 'react';
import { useChatContext } from '@/contexts/ChatContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
}

const AddFriendModal = ({ open, onClose }: AddFriendModalProps) => {
  const { sendFriendRequest, searchUsers, currentUser, getAllOnlineUsers } = useChatContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Record<string, unknown>[]>([]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      const results = searchUsers(searchQuery);
      setSearchResults(results.filter(user => user.id !== currentUser.id));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchUsers, currentUser.id]);

  // Load online users when modal opens
  useEffect(() => {
    if (open) {
      const online = getAllOnlineUsers();
      setOnlineUsers(online);
      console.log('👥 Usuários online encontrados:', online.length);
    }
  }, [open, getAllOnlineUsers]);

  // Auto search when query changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch();
    }, 300); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSearch]);

  const handleSendFriendRequest = (user: Record<string, unknown>) => {
    console.log('🔍 Enviando convite para:', user);
    // Use displayUsername (like #1, #2) for sending the request
    const usernameToSend = user.displayUsername as string || user.username as string;
    console.log('📤 Username usado:', usernameToSend);

    const success = sendFriendRequest(usernameToSend);
    if (success) {
      toast.success(`Pedido de amizade enviado para ${user.name}!`);
      setSearchQuery('');
      setSearchResults([]);
    } else {
      toast.error('Não foi possível enviar o pedido. Usuário já é seu amigo ou pedido já foi enviado.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Adicionar Amigo</span>
          </DialogTitle>
          <DialogDescription>
            Busque por nome, nome de usuário ou ID único (#1, #2, #3...) para adicionar amigos
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nome ou #ID do usuário"
              className="flex-1"
            />
            <Button onClick={handleSearch} variant="outline">
              Buscar
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700">Resultados:</h4>
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                        {user.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-500">{user.displayUsername || user.username}</p>
                        <Badge
                          variant={user.status === 'online' ? 'default' : 'secondary'}
                          className={user.status === 'online' ? 'bg-green-500' : ''}
                        >
                          {user.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSendFriendRequest(user)}
                    size="sm"
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    Enviar Convite
                  </Button>
                </div>
              ))}
            </div>
          )}

          {searchQuery && searchResults.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Nenhum usuário encontrado</p>
              <p className="text-xs">Verifique se o nome ou ID está correto</p>
            </div>
          )}

          {!searchQuery && onlineUsers.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-700">Usuários Online:</h4>
              {onlineUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-r from-green-500 to-blue-500 text-white">
                        {user.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm text-gray-500">{user.username}</p>
                        <Badge className="bg-green-500">
                          online
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleSendFriendRequest(user)}
                    size="sm"
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  >
                    Enviar Convite
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 <strong>Dica:</strong> Compartilhe seu ID <strong>{currentUser.displayUsername || currentUser.username}</strong> com amigos para que eles possam te encontrar!
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Os usuários aparecem automaticamente quando estão online em outros navegadores
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddFriendModal;
