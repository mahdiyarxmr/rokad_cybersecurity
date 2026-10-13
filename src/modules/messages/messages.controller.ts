import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async createMessage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.createMessage(tenantId, userId, dto);
  }

  @Get('inbox')
  async getInbox(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('starredOnly') starredOnly?: string,
    @Query('search') search?: string,
  ) {
    return this.messagesService.getInbox(tenantId, userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      unreadOnly: unreadOnly === 'true',
      starredOnly: starredOnly === 'true',
      search,
    });
  }

  @Get('sent')
  async getSentMessages(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.messagesService.getSentMessages(tenantId, userId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('recipients/allowed')
  async getAllowedRecipients(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.messagesService.getAllowedRecipients(tenantId, userId);
  }

  @Get(':id')
  async getMessageDetails(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
  ) {
    return this.messagesService.getMessageDetails(tenantId, userId, messageId);
  }

  @Patch(':id/star')
  async toggleStar(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
  ) {
    return this.messagesService.toggleStar(tenantId, userId, messageId);
  }

  @Delete(':id')
  async deleteMessage(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Param('id') messageId: string,
  ) {
    return this.messagesService.deleteRecipientMessage(tenantId, userId, messageId);
  }
}
