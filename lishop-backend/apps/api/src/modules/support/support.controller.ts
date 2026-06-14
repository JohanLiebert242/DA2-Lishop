import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SupportTicketsService } from './support-tickets.service';
import { FaqService } from './faq.service';
import { ChatbotService } from './chatbot.service';
import { IsString } from 'class-validator';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { AddMessageDto } from './dto/add-message.dto';
import { UploadSupportMediaDto } from './dto/upload-support-media.dto';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

class ChatRequestDto {
  @IsString()
  message!: string;
}

@ApiTags('support')
@Controller('support')
export class SupportController {
  constructor(
    private readonly ticketsService: SupportTicketsService,
    private readonly faqService: FaqService,
    private readonly chatbotService: ChatbotService,
  ) {}

  // ---- Ticket routes (auth required) ----

  @Post('uploads')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload support ticket media (images) and get a public URL' })
  async upload(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadSupportMediaDto,
  ) {
    const match = /^data:(image\/(png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dto.dataUrl ?? '');
    if (!match) {
      throw new BadRequestException('Unsupported media. Use data URL for png/jpeg/webp.');
    }

    const mime = match[1]!;
    const ext = (match[2] === 'jpg' ? 'jpeg' : match[2])!;
    const base64 = match[3]!;
    const bytes = Buffer.from(base64, 'base64');

    // Basic size guard (~2MB raw)
    if (bytes.length > 2_000_000) {
      throw new BadRequestException('File too large (max ~2MB).');
    }

    const dir = path.resolve(process.cwd(), 'uploads', 'support', userId);
    await mkdir(dir, { recursive: true });
    const id = randomUUID();
    const filename = `${id}.${ext}`;
    const fullPath = path.join(dir, filename);
    await writeFile(fullPath, bytes);

    return { url: `/uploads/support/${encodeURIComponent(userId)}/${encodeURIComponent(filename)}`, mime };
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a support ticket' })
  createTicket(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.createTicket(userId, dto);
  }

  @Get('tickets')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my support tickets' })
  getMyTickets(@CurrentUser('id') userId: string) {
    return this.ticketsService.getMyTickets(userId);
  }

  @Get('tickets/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a support ticket with messages' })
  getMyTicket(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ticketsService.getMyTicket(userId, id);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a message to a ticket' })
  addMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.ticketsService.addCustomerMessage(userId, id, dto);
  }

  // ---- FAQ routes (public) ----

  @Get('faq')
  @Public()
  @ApiOperation({ summary: 'Get published FAQs grouped by category' })
  getFaq() {
    return this.faqService.getPublished();
  }

  @Get('faq/search')
  @Public()
  @ApiOperation({ summary: 'Search FAQs' })
  searchFaq(@Query('q') q: string) {
    return this.faqService.search(q ?? '');
  }

  // ---- Chatbot (public) ----

  @Post('chat')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with AI shopping assistant' })
  chat(
    @Body() dto: ChatRequestDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.chatbotService.reply(dto.message ?? '', { userId });
  }
}
