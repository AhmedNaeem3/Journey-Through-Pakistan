import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../services/api';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const socketRef = useRef(null);
  const onlineUsersSetRef = useRef(new Set());

  useEffect(() => {
    const connectSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
          console.log('No token found, cannot connect to socket');
          return;
        }

        // Create socket connection
        const newSocket = io(API_URL, {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
          console.log('Socket connected:', newSocket.id);
          setIsConnected(true);
          socketRef.current = newSocket;
        });

        newSocket.on('disconnect', () => {
          console.log('Socket disconnected');
          setIsConnected(false);
          socketRef.current = null;
        });

        newSocket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          setIsConnected(false);
        });

        // Handle online/offline status
        newSocket.on('user-online', (data) => {
          onlineUsersSetRef.current.add(data.userId);
          setOnlineUsers(new Set(onlineUsersSetRef.current));
        });

        newSocket.on('user-offline', (data) => {
          onlineUsersSetRef.current.delete(data.userId);
          setOnlineUsers(new Set(onlineUsersSetRef.current));
        });

        // Handle message events
        newSocket.on('message-edited', (data) => {
          console.log('Message edited:', data);
        });

        newSocket.on('message-deleted', (data) => {
          console.log('Message deleted:', data);
        });

        newSocket.on('message-unsent', (data) => {
          console.log('Message unsent:', data);
        });

        // Handle notification events
        newSocket.on('new-notification', (data) => {
          console.log('New notification received:', data);
          // You can emit a custom event here that components can listen to
          // For now, we'll just log it. Components can poll or listen to this.
        });

        setSocket(newSocket);

        // Cleanup function
        return () => {
          if (newSocket) {
            newSocket.disconnect();
          }
        };
      } catch (error) {
        console.error('Error connecting to socket:', error);
      }
    };

    connectSocket();
  }, []);

  // Provide socket and related state to children
  return (
    <SocketContext.Provider value={{
      socket,
      isConnected,
      onlineUsers,
      socketRef
    }}>
      {children}
    </SocketContext.Provider>
  );
};