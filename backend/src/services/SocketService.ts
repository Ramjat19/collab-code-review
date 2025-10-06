import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import Room from '../models/Room';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

class SocketService {
  private io: SocketServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  // Getter to access io instance
  public get ioInstance(): SocketServer {
    return this.io;
  }

  constructor(server: HttpServer) {
    this.io = new SocketServer(server, {
      cors: {
        origin: [
          "http://localhost:3000", 
          "http://localhost:5173", 
          "http://localhost:5174", 
          "http://localhost:5175", 
          "http://localhost:5176", 
          "http://localhost:5177",
          "http://127.0.0.1:3000", 
          "http://127.0.0.1:5173", 
          "http://127.0.0.1:5174", 
          "http://127.0.0.1:5175", 
          "http://127.0.0.1:5176", 
          "http://127.0.0.1:5177"
        ],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
        socket.userId = decoded.id;
        socket.username = decoded.username;
        
        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.username} connected with socket ID: ${socket.id}`);
      
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket);
      }

      // Join PR room
      socket.on('join-pr-room', async (data: { pullRequestId: string, projectId: string }) => {
        try {
          const roomId = `pr-${data.pullRequestId}`;
          
          // Join the socket room
          await socket.join(roomId);
          
          // Find or create the room in database
          let room = await Room.findOne({ pullRequestId: data.pullRequestId });
          if (!room) {
            room = new Room({
              pullRequestId: data.pullRequestId,
              projectId: data.projectId,
              participants: [socket.userId],
              isActive: true
            });
          } else if (!room.participants.includes(socket.userId as any)) {
            room.participants.push(socket.userId as any);
          }
          
          await room.save();
          
          console.log(`${socket.username} joined PR room: ${roomId}`);
          
          // Notify others in the room
          socket.to(roomId).emit('user-joined-room', {
            userId: socket.userId,
            username: socket.username
          });
          
          // Send current room participants to the new user
          const roomSockets = await this.io.in(roomId).fetchSockets();
          socket.emit('room-participants', {
            count: roomSockets.length,
            participants: roomSockets.map(s => ({
              userId: (s as AuthenticatedSocket).userId,
              username: (s as AuthenticatedSocket).username
            }))
          });
          
        } catch (error) {
          console.error('Error joining PR room:', error);
          socket.emit('error', { message: 'Failed to join PR room' });
        }
      });

      // Leave PR room
      socket.on('leave-pr-room', async (data: { pullRequestId: string }) => {
        const roomId = `pr-${data.pullRequestId}`;
        await socket.leave(roomId);
        
        // Notify others in the room
        socket.to(roomId).emit('user-left-room', {
          userId: socket.userId,
          username: socket.username
        });
        
        console.log(`${socket.username} left PR room: ${roomId}`);
      });

      // Handle new comments
      socket.on('new-comment', (data: {
        pullRequestId: string;
        comment: any;
        lineNumber?: number;
        fileId?: string;
      }) => {
        const roomId = `pr-${data.pullRequestId}`;
        
        // Broadcast to all other users in the room
        socket.to(roomId).emit('comment-added', {
          comment: data.comment,
          lineNumber: data.lineNumber,
          fileId: data.fileId,
          author: {
            id: socket.userId,
            username: socket.username
          }
        });
        
        console.log(`New comment from ${socket.username} in PR ${data.pullRequestId}`);
      });

      // Handle comment updates/edits
      socket.on('update-comment', (data: {
        pullRequestId: string;
        commentId: string;
        content: string;
      }) => {
        const roomId = `pr-${data.pullRequestId}`;
        
        socket.to(roomId).emit('comment-updated', {
          commentId: data.commentId,
          content: data.content,
          updatedBy: {
            id: socket.userId,
            username: socket.username
          }
        });
      });

      // Handle comment deletion
      socket.on('delete-comment', (data: {
        pullRequestId: string;
        commentId: string;
      }) => {
        const roomId = `pr-${data.pullRequestId}`;
        
        socket.to(roomId).emit('comment-deleted', {
          commentId: data.commentId,
          deletedBy: {
            id: socket.userId,
            username: socket.username
          }
        });
      });

      // Handle PR status changes
      socket.on('pr-status-change', (data: {
        pullRequestId: string;
        status: string;
        reviewDecision?: string;
      }) => {
        const roomId = `pr-${data.pullRequestId}`;
        
        socket.to(roomId).emit('pr-status-updated', {
          status: data.status,
          reviewDecision: data.reviewDecision,
          updatedBy: {
            id: socket.userId,
            username: socket.username
          }
        });
      });

      // Handle typing indicators
      socket.on('typing-start', (data: { pullRequestId: string, lineNumber?: number }) => {
        const roomId = `pr-${data.pullRequestId}`;
        
        socket.to(roomId).emit('user-typing', {
          userId: socket.userId,
          username: socket.username,
          lineNumber: data.lineNumber
        });
      });

      socket.on('typing-stop', (data: { pullRequestId: string, lineNumber?: number }) => {
        const roomId = `pr-${data.pullRequestId}`;
        
        socket.to(roomId).emit('user-stopped-typing', {
          userId: socket.userId,
          username: socket.username,
          lineNumber: data.lineNumber
        });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`User ${socket.username} disconnected`);
        
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
        }
      });
    });
  }

  // Public methods for external use
  public broadcastToRoom(roomId: string, event: string, data: any) {
    this.io.to(`pr-${roomId}`).emit(event, data);
  }

  public getUserSocket(userId: string): AuthenticatedSocket | undefined {
    return this.connectedUsers.get(userId);
  }

  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  public sendNotification(userId: string, notification: any) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      userSocket.emit('notification', notification);
      console.log(`Notification sent to user ${userId}`);
    } else {
      console.log(`User ${userId} is not connected, notification stored for later`);
    }
  }

  public broadcastNotification(userIds: string[], notification: any) {
    userIds.forEach(userId => {
      this.sendNotification(userId, notification);
    });
  }
}

export default SocketService;