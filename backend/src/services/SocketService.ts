import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, string[]> = new Map();

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  /**
   * Initialise le serveur Socket.IO
   */
  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log(`🔌 Socket connecté: ${socket.id}`);

      // Authentification par userId
      socket.on('authenticate', (userId: string) => {
        if (!this.userSockets.has(userId)) {
          this.userSockets.set(userId, []);
        }
        this.userSockets.get(userId)?.push(socket.id);
        socket.join(`user:${userId}`);
        console.log(`👤 Socket ${socket.id} authentifié pour user ${userId}`);
      });

      socket.on('disconnect', () => {
        console.log(`🔌 Socket déconnecté: ${socket.id}`);
        // Nettoyer les associations utilisateur
        this.userSockets.forEach((sockets, userId) => {
          const index = sockets.indexOf(socket.id);
          if (index > -1) {
            sockets.splice(index, 1);
            if (sockets.length === 0) {
              this.userSockets.delete(userId);
            }
          }
        });
      });
    });

    console.log('✅ Service Socket initialisé');
  }

  /**
   * Émet un événement à un utilisateur spécifique
   */
  emitToUser(userId: string, event: string, data: any) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO non initialisé');
      return;
    }

    this.io.to(`user:${userId}`).emit(event, data);
    console.log(`📡 Événement '${event}' envoyé à user ${userId}:`, data);
  }

  /**
   * Émet un événement à tous les utilisateurs connectés
   */
  emitToAll(event: string, data: any) {
    if (!this.io) {
      console.warn('⚠️ Socket.IO non initialisé');
      return;
    }

    this.io.emit(event, data);
    console.log(`📡 Événement '${event}' diffusé à tous:`, data);
  }

  /**
   * Obtient les utilisateurs connectés
   */
  getConnectedUsers(): string[] {
    return Array.from(this.userSockets.keys());
  }

  /**
   * Vérifie si un utilisateur est connecté
   */
  isUserConnected(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.length > 0 : false;
  }
} 