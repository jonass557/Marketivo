import { createContext, useContext, useEffect, useState, useRef } from 'react';
import AuthContext from './AuthContext';
import API_URL from '../config/api';

const SocketContext = createContext({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized || socketRef.current) return;
    setInitialized(true);

    const initSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        
        const newSocket = io(API_URL, {
          autoConnect: true,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
          console.log('🔌 Socket connecté');
          setConnected(true);
        });

        newSocket.on('disconnect', () => {
          console.log('🔌 Socket déconnecté');
          setConnected(false);
        });

        newSocket.on('connect_error', (err) => {
          console.warn('Socket erreur connexion:', err.message);
        });

        setSocket(newSocket);
      } catch (error) {
        console.warn('Socket.io non disponible:', error.message);
      }
    };

    initSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [initialized]);

  // Rejoindre les rooms quand l'utilisateur se connecte
  useEffect(() => {
    if (socket && connected && user?.id) {
      socket.emit('join', user.id);
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        socket.emit('joinAdmin');
      }
    }
  }, [socket, connected, user]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
