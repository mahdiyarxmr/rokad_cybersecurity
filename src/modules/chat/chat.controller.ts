import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  CreateDirectChannelDto,
  CreateClassChannelDto,
  SendMessageDto,
} from './dto/create-channel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/constants';

@ApiTags('Communication — Chat & Channels (پیام‌رسان و گفتگو)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('channels/direct')
  @ApiOperation({ summary: 'ایجاد یا بازیابی کانال گفتگوی مستقیم ۲ نفره' })
  async getOrCreateDirectChannel(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateDirectChannelDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.chatService.getOrCreateDirectChannel(
      effectiveTenantId,
      userId,
      dto,
    );
  }

  @Post('channels/class')
  @Roles(Role.SUPER_ADMIN, Role.SCHOOL_ADMIN, Role.TEACHER, Role.STAFF)
  @ApiOperation({ summary: 'ایجاد یا بازیابی کانال گفتگوی کلاسی' })
  async getOrCreateClassChannel(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: CreateClassChannelDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.chatService.getOrCreateClassChannel(
      effectiveTenantId,
      userId,
      dto,
    );
  }

  @Get('channels')
  @ApiOperation({ summary: 'لیست کانال‌ها و گفتگوهای کاربر با آخرین پیام' })
  async listUserChannels(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.chatService.listUserChannels(effectiveTenantId, userId);
  }

  @Post('messages')
  @ApiOperation({ summary: 'ارسال پیام جدید در کانال گفتگو (از طریق REST)' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Body() dto: SendMessageDto,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.chatService.saveMessage(effectiveTenantId, userId, dto);
  }

  @Get('channels/:channelId/messages')
  @ApiOperation({ summary: 'مشاهده تاریخچه پیام‌های یک کانال به همراه صفحه‌بندی' })
  async listChannelMessages(
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') userTenantId: string,
    @CurrentTenant('id') tenantId: string,
    @Param('channelId') channelId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const effectiveTenantId = tenantId || userTenantId;
    return this.chatService.listChannelMessages(
      effectiveTenantId,
      channelId,
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
