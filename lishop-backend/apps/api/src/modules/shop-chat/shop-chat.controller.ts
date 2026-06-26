import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString } from 'class-validator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { prisma } from '@lishop/database';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShopChatService } from './shop-chat.service';

class SendMessageDto {
  @IsString()
  content!: string;
}

@ApiTags('shop-chat')
@Controller()
export class ShopChatController {
  constructor(private readonly chatService: ShopChatService) {}

  // ─── Customer endpoints ───

  @Get('shops/:slug/chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get chat history for a shop (customer)' })
  getChatHistory(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.chatService.getMessages(slug, userId);
  }

  @Post('shops/:slug/chat')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a message to a shop (customer)' })
  sendMessage(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(slug, userId, dto.content);
  }

  // ─── Seller endpoints ───

  @Get('seller/chat/shop')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get seller shop info for WebSocket room' })
  async getSellerShop(@CurrentUser('id') userId: string) {
    const shop = await this.getSellerShopOrThrow(userId);
    return { id: shop.id, name: shop.name, slug: shop.slug };
  }

  @Get('seller/chat/conversations')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all conversations for seller shop' })
  async getConversations(@CurrentUser('id') userId: string) {
    const shop = await this.getSellerShopOrThrow(userId);
    return this.chatService.getSellerConversations(shop.id);
  }

  @Get('seller/chat/conversations/:customerUserId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation messages with a customer' })
  async getConversationMessages(
    @Param('customerUserId') customerUserId: string,
    @CurrentUser('id') userId: string,
  ) {
    const shop = await this.getSellerShopOrThrow(userId);
    return this.chatService.getSellerConversationMessages(shop.id, customerUserId, userId);
  }

  @Post('seller/chat/conversations/:customerUserId')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a customer conversation' })
  async replyToCustomer(
    @Param('customerUserId') customerUserId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SendMessageDto,
  ) {
    const shop = await this.getSellerShopOrThrow(userId);
    return this.chatService.sendSellerReply(shop.id, customerUserId, userId, dto.content);
  }

  private async getSellerShopOrThrow(userId: string) {
    const shop = await prisma.shop.findUnique({ where: { userId } });
    if (!shop) throw new NotFoundException('Bạn chưa có cửa hàng');
    return shop;
  }
}
