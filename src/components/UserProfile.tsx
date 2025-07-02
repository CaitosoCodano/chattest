
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface UserProfileProps {
  user: any;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const UserProfile = ({ user, open, onClose, onLogout }: UserProfileProps) => {
  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Perfil do Usuário</DialogTitle>
          <DialogDescription>
            Suas informações de conta
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-2xl">
                {user.avatar}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900">{user.name}</h3>
              <p className="text-gray-500">{user.displayUsername || user.username}</p>
              <Badge
                variant={user.status === 'online' ? 'default' : 'secondary'}
                className={`mt-2 ${user.status === 'online' ? 'bg-green-500' : ''}`}
              >
                {user.status === 'online' ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Seu ID único</h4>
              <p className="text-blue-700 font-mono text-lg">{user.displayUsername || user.username}</p>
              <p className="text-sm text-blue-600 mt-1">
                Compartilhe este ID com amigos para que eles possam te encontrar!
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Fechar
            </Button>
            <Button 
              onClick={handleLogout} 
              variant="destructive" 
              className="flex-1"
            >
              Sair
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfile;
