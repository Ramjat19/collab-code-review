import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface Comment {
  _id: string;
  author: {
    id: string;
    username: string;
    email: string;
  };
  text: string;
  filePath?: string;
  lineNumber?: number;
  createdAt: string;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinPRRoom: (pullRequestId: string, projectId: string) => void;
  leavePRRoom: (pullRequestId: string) => void;
  sendComment: (pullRequestId: string, comment: Comment, lineNumber?: number, fileId?: string) => void;
  onCommentAdded: (callback: (data: any) => void) => void;
  onCommentUpdated: (callback: (data: any) => void) => void;
  onCommentDeleted: (callback: (data: any) => void) => void;
  onUserJoined: (callback: (data: any) => void) => void;
  onUserLeft: (callback: (data: any) => void) => void;
  onTyping: (callback: (data: any) => void) => void;
  sendTyping: (pullRequestId: string, lineNumber?: number) => void;
  stopTyping: (pullRequestId: string, lineNumber?: number) => void;
  roomParticipants: Array<{ userId: string; username: string }>;
}

export const useSocket = (): UseSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState<Array<{ userId: string; username: string }>>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log('No token found, socket will not connect');
      return;
    }

    // Initialize socket connection
    socketRef.current = io('http://localhost:4000', {
      auth: {
        token: token
      },
      autoConnect: true
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from Socket.IO server');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // Room participants
    socket.on('room-participants', (data) => {
      setRoomParticipants(data.participants || []);
    });

    socket.on('user-joined-room', (data) => {
      setRoomParticipants(prev => [
        ...prev.filter(p => p.userId !== data.userId),
        { userId: data.userId, username: data.username }
      ]);
    });

    socket.on('user-left-room', (data) => {
      setRoomParticipants(prev => prev.filter(p => p.userId !== data.userId));
    });

    // Handle incoming notifications
    socket.on('notification', (notification) => {
      console.log('New notification received:', notification);
      // Dispatch custom event for notification components to listen
      window.dispatchEvent(new CustomEvent('newNotification', { detail: notification }));
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const joinPRRoom = useCallback((pullRequestId: string, projectId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-pr-room', { pullRequestId, projectId });
    }
  }, []);

  const leavePRRoom = useCallback((pullRequestId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-pr-room', { pullRequestId });
    }
  }, []);

  const sendComment = useCallback((pullRequestId: string, comment: Comment, lineNumber?: number, fileId?: string) => {
    if (socketRef.current) {
      socketRef.current.emit('new-comment', {
        pullRequestId,
        comment,
        lineNumber,
        fileId
      });
    }
  }, []);

  const sendTyping = useCallback((pullRequestId: string, lineNumber?: number) => {
    if (socketRef.current) {
      socketRef.current.emit('typing-start', { pullRequestId, lineNumber });
    }
  }, []);

  const stopTyping = useCallback((pullRequestId: string, lineNumber?: number) => {
    if (socketRef.current) {
      socketRef.current.emit('typing-stop', { pullRequestId, lineNumber });
    }
  }, []);

  const onCommentAdded = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('comment-added', callback);
    }
  }, []);

  const onCommentUpdated = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('comment-updated', callback);
    }
  }, []);

  const onCommentDeleted = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('comment-deleted', callback);
    }
  }, []);

  const onUserJoined = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('user-joined-room', callback);
    }
  }, []);

  const onUserLeft = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('user-left-room', callback);
    }
  }, []);

  const onTyping = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on('user-typing', callback);
      socketRef.current.on('user-stopped-typing', callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinPRRoom,
    leavePRRoom,
    sendComment,
    onCommentAdded,
    onCommentUpdated,
    onCommentDeleted,
    onUserJoined,
    onUserLeft,
    onTyping,
    sendTyping,
    stopTyping,
    roomParticipants
  };
};