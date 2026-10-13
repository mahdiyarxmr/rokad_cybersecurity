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

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('⚡ ChatGateway initialized on namespace /chat');
  }

  async handleConnection(client: Socket) {
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
      if (!payload?.sub || payload.tokenUse === 'download' || payload.tokenUse === '2fa' || payload.requiresTwoFactor) {
        throw new UnauthorizedException('توکن وب‌سوکت نامعتبر است');
      }
      const dbUser = await this.chatService.getActiveUser(payload.sub);
      if (!dbUser) {
        throw new UnauthorizedException('حساب کاربری وب‌سوکت معتبر نیست');
      }
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
    this.logger.log(`Client disconnected: ${client.id}`);
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
    if (!user) return;

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
    if (!user) return;

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
    if (!user) return;

    client.to(`channel:${data.channelId}`).emit('user_typing', {
      channelId: data.channelId,
      userId: user.id,
      isTyping: data.isTyping,
    });
  }
}
