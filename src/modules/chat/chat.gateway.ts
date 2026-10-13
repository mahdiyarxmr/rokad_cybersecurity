import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/create-channel.dto';
import { resolveCorsOrigins, resolveSecret } from '../../common/security/security-policy';

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, ok?: boolean) => void) => {
      try {
        const allow = resolveCorsOrigins();
        if (!origin || allow.includes(origin)) callback(null, true);
        else callback(new Error('origin not allowed'), false);
      } catch (err) {
        callback(err as Error, false);
      }
    },
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly socketsByIp = new Map<string, number>();
  private readonly socketsByUser = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('⚡ ChatGateway initialized on namespace /chat');
  }

  async handleConnection(client: Socket) {
    const ip = client.handshake.address || 'unknown';
    const ipCount = this.socketsByIp.get(ip) || 0;
    if (ipCount >= MAX_SOCKETS_PER_IP) {
      client.disconnect(true);
      return;
    }
    this.socketsByIp.set(ip, ipCount + 1);
    client.data.ip = ip;
    try {
      const authHeader =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization;

      if (!authHeader) {
        throw new UnauthorizedException('توکن احراز هویت وب‌سوکت ارسال نشده است');
      }

      const token = authHeader.replace(/^Bearer\s+/i, '');
      const secret = resolveSecret(
        'JWT_ACCESS_SECRET',
        this.configService.get<string>('JWT_ACCESS_SECRET'),
      );

      const payload = this.jwtService.verify(token, { secret });
      if (
        !payload?.sub ||
        payload.tokenUse === 'download' ||
        payload.tokenUse === '2fa' ||
        payload.tokenUse === 'password_change' ||
        payload.requiresTwoFactor
      ) {
        throw new UnauthorizedException('توکن وب‌سوکت نامعتبر است');
      }
      const dbUser = await this.chatService.getActiveUser(payload.sub);
      if (!dbUser || dbUser.mustChangePassword) {
        throw new UnauthorizedException('حساب کاربری وب‌سوکت معتبر نیست');
      }
      const userCount = this.socketsByUser.get(dbUser.id) || 0;
      if (userCount >= MAX_SOCKETS_PER_USER) {
        throw new UnauthorizedException('تعداد اتصال همزمان بیش از حد مجاز است');
      }
      this.socketsByUser.set(dbUser.id, userCount + 1);
      client.data.countedUser = dbUser.id;
      client.data.user = {
        id: dbUser.id,
        tenantId: dbUser.tenantId,
        role: dbUser.role,
        isPlatformAdmin: dbUser.isPlatformAdmin,
      };

      // Automatically join personal room and tenant-isolated room
      client.join(`user:${dbUser.id}`);
      client.join(`tenant:${dbUser.tenantId}`);

      this.logger.log(
        `Client connected: ${client.id} (User: ${payload.sub}, Tenant: ${payload.tenantId})`,
      );
    } catch (err: any) {
      this.logger.warn(`WebSocket connection unauthorized: ${err.message}`);
      client.emit('error', { message: 'احراز هویت ناموفق بود' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const ip = client.data.ip;
    if (ip) {
      const next = (this.socketsByIp.get(ip) || 1) - 1;
      if (next > 0) this.socketsByIp.set(ip, next);
      else this.socketsByIp.delete(ip);
    }
    const userId = client.data.countedUser;
    if (userId) {
      const next = (this.socketsByUser.get(userId) || 1) - 1;
      if (next > 0) this.socketsByUser.set(userId, next);
      else this.socketsByUser.delete(userId);
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private allowEvent(client: Socket): boolean {
    const now = Date.now();
    const windowStart = client.data.eventWindow || now;
    const count = windowStart + 60_000 < now ? 0 : client.data.eventCount || 0;
    if (count >= MAX_EVENTS_PER_MINUTE) {
      client.emit('error', { message: 'تعداد پیام‌های لحظه‌ای بیش از حد مجاز است' });
      return false;
    }
    client.data.eventWindow = count === 0 ? now : windowStart;
    client.data.eventCount = count + 1;
    return true;
  }

  /**
   * Join a specific chat channel
   */
  @SubscribeMessage('join_channel')
  async handleJoinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string },
  ) {
    const user = client.data.user;
    if (!user || !this.allowEvent(client)) return;
    if (client.rooms.size >= MAX_ROOMS_PER_SOCKET) {
      client.emit('error', { message: 'تعداد اتاق‌های این اتصال بیش از حد مجاز است' });
      return { success: false, error: 'TOO_MANY_ROOMS' };
    }

    const allowed = await this.chatService.verifyChannelMembership(
      user.tenantId,
      user.id,
      data.channelId,
    );
    if (!allowed) {
      client.emit('error', { message: 'شما عضو این کانال گفتگو نیستید' });
      return { success: false, error: 'FORBIDDEN_CHANNEL_ACCESS' };
    }

    client.join(`channel:${data.channelId}`);
    return { success: true, channelId: data.channelId };
  }

  /**
   * Join a classroom room with strict membership verification (Anti-Unauthorized Join)
   */
  @SubscribeMessage('join_classroom')
  async handleJoinClassroom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classroomId: string },
  ) {
    const user = client.data.user;
    if (!user || !this.allowEvent(client)) return;
    if (client.rooms.size >= MAX_ROOMS_PER_SOCKET) {
      client.emit('error', { message: 'تعداد اتاق‌های این اتصال بیش از حد مجاز است' });
      return { success: false, error: 'TOO_MANY_ROOMS' };
    }

    // Strict Authorization check against DB
    const isMember = await this.chatService.verifyClassroomMembership(
      user.tenantId,
      user.id,
      data.classroomId,
    );

    if (!isMember) {
      client.emit('error', {
        message: 'شما عضو این کلاس نیستید و دسترسی به اتاق گفتگوی آن را ندارید',
      });
      return { success: false, error: 'FORBIDDEN_CLASSROOM_ACCESS' };
    }

    client.join(`class:${data.classroomId}`);
    return { success: true, classroomId: data.classroomId };
  }

  /**
   * Send Real-Time Chat Message
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const user = client.data.user;
    if (!user) {
      client.emit('error', { message: 'عدم احراز هویت' });
      return;
    }
    if (!this.allowEvent(client)) return;
    const content = typeof dto?.content === 'string' ? dto.content : '';
    if (content.length > 4000) {
      client.emit('error', { message: 'طول پیام بیش از حد مجاز است' });
      return { success: false, error: 'MESSAGE_TOO_LARGE' };
    }

    try {
      const savedMessage = await this.chatService.saveMessage(
        user.tenantId,
        user.id,
        dto,
      );

      // Broadcast to all participants in the channel room
      this.server
        .to(`channel:${dto.channelId}`)
        .emit('receive_message', savedMessage);

      return { success: true, message: savedMessage };
    } catch (err: any) {
      client.emit('error', { message: err.message });
      return { success: false, error: err.message };
    }
  }

  /**
   * Typing indicator
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { channelId: string; isTyping: boolean },
  ) {
    const user = client.data.user;
    if (!user || !this.allowEvent(client)) return;

    client.to(`channel:${data.channelId}`).emit('user_typing', {
      channelId: data.channelId,
      userId: user.id,
      isTyping: data.isTyping,
    });
  }
}
