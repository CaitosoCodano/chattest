
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, AlertCircle } from 'lucide-react';
import { toast } from '@/components/ui/sonner';

interface UserData {
  id: string;
  name: string;
  username: string;
  password: string;
  displayUsername?: string;
  sequentialId?: number;
  avatar: string;
  status: 'online' | 'offline';
  createdAt: string;
}

interface AuthScreenProps {
  onLogin: (userData: UserData) => void;
}

const AuthScreen = ({ onLogin }: AuthScreenProps) => {
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [registerData, setRegisterData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [registeredUsersCount, setRegisteredUsersCount] = useState(0);

  // Sync server configuration
  const SYNC_SERVER_URL = import.meta.env.PROD
    ? '/api'  // In production, use relative URL (same server)
    : 'http://localhost:3001/api';  // In development, use separate server

  // Fallback keys for offline mode
  const SHARED_USERS_KEY = 'shared_registered_users_db';
  const SHARED_COUNTER_KEY = 'shared_user_counter';

  // Helper functions - declared first to avoid hoisting issues
  const generateNextUserId = () => {
    const lastUserId = localStorage.getItem(SHARED_COUNTER_KEY);
    const nextId = lastUserId ? parseInt(lastUserId) + 1 : 1;
    localStorage.setItem(SHARED_COUNTER_KEY, nextId.toString());
    return nextId;
  };

  const getAllRegisteredUsers = () => {
    console.log('📋 Buscando usuários registrados...');

    // First, try to get from shared database (localStorage)
    const sharedUsersData = localStorage.getItem(SHARED_USERS_KEY);
    console.log('🔍 Dados compartilhados:', sharedUsersData ? `${JSON.parse(sharedUsersData).length} usuários` : 'Nenhum');

    if (sharedUsersData) {
      try {
        const users = JSON.parse(sharedUsersData);
        console.log('✅ Retornando usuários da base compartilhada:', users.length);
        return users;
      } catch (error) {
        console.error('❌ Erro ao analisar dados de usuários compartilhados:', error);
      }
    }

    // Fallback: migrate old individual user records to shared database
    console.log('🔄 Procurando dados antigos para migração...');
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('registered_user_')) {
        console.log('📁 Encontrado registro antigo:', key);
        try {
          const userData = JSON.parse(localStorage.getItem(key) || '');
          users.push(userData);
        } catch (error) {
          console.error('❌ Erro ao analisar dados do usuário:', error);
        }
      }
    }

    // Save to shared database and clean up old records
    if (users.length > 0) {
      console.log(`💾 Salvando ${users.length} usuários na base compartilhada`);
      localStorage.setItem(SHARED_USERS_KEY, JSON.stringify(users));
      // Clean up old individual records
      users.forEach(user => {
        localStorage.removeItem(`registered_user_${user.username}`);
      });
    }

    console.log('📊 Total de usuários encontrados:', users.length);
    return users;
  };

  const updateRegisteredUsersCount = useCallback(() => {
    const users = getAllRegisteredUsers();
    setRegisteredUsersCount(users.length);
  }, []);

  const migrateToSharedDatabase = () => {
    console.log('🔍 Verificando necessidade de migração...');

    // Check if migration is needed
    const sharedData = localStorage.getItem(SHARED_USERS_KEY);
    console.log('📊 Dados compartilhados existentes:', sharedData ? 'SIM' : 'NÃO');

    if (sharedData) {
      console.log('✅ Dados já estão na base compartilhada');
      return; // Already migrated
    }

    // Migrate old individual user records
    const users = [];
    const keysToRemove = [];

    console.log('🔍 Procurando dados antigos...');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('registered_user_')) {
        console.log('📁 Encontrado:', key);
        try {
          const userData = JSON.parse(localStorage.getItem(key) || '');
          users.push(userData);
          keysToRemove.push(key);
        } catch (error) {
          console.error('❌ Erro ao analisar dados do usuário durante migração:', error);
        }
      }
    }

    if (users.length > 0) {
      localStorage.setItem(SHARED_USERS_KEY, JSON.stringify(users));
      // Clean up old records
      keysToRemove.forEach(key => localStorage.removeItem(key));
      console.log(`✅ Migrados ${users.length} usuários para a base compartilhada`);
    } else {
      console.log('ℹ️ Nenhum dado antigo encontrado para migrar');
    }
  };

  // Migration function to move old data to shared database
  useEffect(() => {
    console.log('🔄 Iniciando migração de dados...');
    migrateToSharedDatabase();
    updateRegisteredUsersCount();
  }, [updateRegisteredUsersCount]);

  // Update count on component mount (don't clear data automatically)
  useEffect(() => {
    updateRegisteredUsersCount();
  }, [updateRegisteredUsersCount]);

  // API functions for sync server
  const fetchUsersFromServer = async () => {
    try {
      const response = await fetch(`${SYNC_SERVER_URL}/users`);
      if (response.ok) {
        const data = await response.json();
        console.log('🌐 Dados carregados do servidor:', data.users.length, 'usuários');
        return data.users;
      }
    } catch (error) {
      console.log('⚠️ Servidor offline, usando dados locais');
    }
    return null;
  };

  const saveUserToServer = async (userData: UserData) => {
    try {
      const response = await fetch(`${SYNC_SERVER_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      if (response.ok) {
        const savedUser = await response.json();
        console.log('🌐 Usuário salvo no servidor:', savedUser.displayUsername);
        return savedUser;
      }
    } catch (error) {
      console.log('⚠️ Erro ao salvar no servidor, usando localStorage');
    }
    return null;
  };



  // Async version that tries server first
  const getAllRegisteredUsersAsync = async () => {
    console.log('📋 Buscando usuários (async)...');

    // Try server first
    const serverUsers = await fetchUsersFromServer();
    if (serverUsers) {
      // Update localStorage with server data
      localStorage.setItem(SHARED_USERS_KEY, JSON.stringify(serverUsers));
      return serverUsers;
    }

    // Fallback to localStorage
    return getAllRegisteredUsers();
  };



  const saveUserToSharedDatabase = (userData: UserData) => {
    const existingUsers = getAllRegisteredUsers();
    const updatedUsers = [...existingUsers, userData];
    localStorage.setItem(SHARED_USERS_KEY, JSON.stringify(updatedUsers));
  };

  const validateLogin = (username: string, password: string) => {
    const allUsers = getAllRegisteredUsers();
    const user = allUsers.find((u: UserData) => u.username === username);

    if (!user) {
      return { success: false, message: 'Usuário não encontrado. Você precisa se cadastrar primeiro.' };
    }

    if (user.password === password) {
      return { success: true, user: user };
    } else {
      return { success: false, message: 'Senha incorreta.' };
    }
  };

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const validation = validateLogin(loginData.username, loginData.password);

    if (validation.success && validation.user) {
      toast.success('Login realizado com sucesso!');
      onLogin(validation.user);
    } else {
      toast.error(validation.message);
    }

    setIsLoading(false);
  };

  const handleRegister = async () => {
    if (!registerData.name || !registerData.username || !registerData.password || !registerData.confirmPassword) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (registerData.password.length < 4) {
      toast.error('A senha deve ter pelo menos 4 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      // Check if username already exists (try server first)
      const allUsers = await getAllRegisteredUsersAsync();
      const existingUser = allUsers.find((u: UserData) => u.username === registerData.username);
      if (existingUser) {
        toast.error('Nome de usuário já existe. Escolha outro.');
        setIsLoading(false);
        return;
      }

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create new user data
      const userData: UserData = {
        id: `user_${Date.now()}`,
        name: registerData.name,
        username: registerData.username,
        password: registerData.password,
        avatar: '😊',
        status: 'online' as const,
        createdAt: new Date().toISOString(),
      };

      // Try to save to server first
      const savedUser = await saveUserToServer(userData);

      if (savedUser) {
        // Server save successful
        toast.success(`Conta criada com sucesso! Seu ID é ${savedUser.displayUsername}`);
        // Update localStorage with server data
        const serverUsers = await fetchUsersFromServer();
        if (serverUsers) {
          localStorage.setItem(SHARED_USERS_KEY, JSON.stringify(serverUsers));
        }
        onLogin(savedUser);
      } else {
        // Fallback to localStorage
        const userId = generateNextUserId();
        userData.displayUsername = `#${userId}`;
        userData.sequentialId = userId;
        saveUserToSharedDatabase(userData);
        toast.success(`Conta criada com sucesso! Seu ID é #${userId}`);
        onLogin(userData);
      }

      updateRegisteredUsersCount();
    } catch (error) {
      console.error('Erro durante registro:', error);
      toast.error('Erro ao criar conta. Tente novamente.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            ChatApp
          </h1>
          <p className="text-gray-600 mt-2">Conecte-se com seus amigos</p>
          <div className="text-center">
            <p className="text-sm text-gray-500 mt-2">
              👥 {registeredUsersCount} usuário{registeredUsersCount !== 1 ? 's' : ''} cadastrado{registeredUsersCount !== 1 ? 's' : ''}
            </p>

          </div>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-center">Bem-vindo!</CardTitle>
            <CardDescription className="text-center">
              Entre na sua conta ou crie uma nova
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Nome de usuário"
                    value={loginData.username}
                    onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    disabled={isLoading}
                    className="h-12"
                  />
                  <Input
                    type="password"
                    placeholder="Senha"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    disabled={isLoading}
                    className="h-12"
                  />
                </div>
                <Button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Nome completo"
                    value={registerData.name}
                    onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                    disabled={isLoading}
                    className="h-12"
                  />
                  <Input
                    placeholder="Nome de usuário"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                    disabled={isLoading}
                    className="h-12"
                  />
                  <Input
                    type="password"
                    placeholder="Senha"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    disabled={isLoading}
                    className="h-12"
                  />
                  <Input
                    type="password"
                    placeholder="Confirmar senha"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    disabled={isLoading}
                    className="h-12"
                  />
                </div>
                <Button
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50"
                >
                  {isLoading ? 'Criando...' : 'Criar Conta'}
                </Button>
                <div className="text-xs text-gray-500 text-center space-y-1">
                  <p>Ao criar sua conta, você receberá um ID único sequencial (#1, #2, #3...) para que amigos possam te encontrar!</p>
                  <p className="text-red-500 font-medium">⚠️ Agora é necessário ter uma conta cadastrada para fazer login!</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthScreen;

