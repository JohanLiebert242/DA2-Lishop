import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { AddTrackingEventDto } from '../orders/dto/add-tracking-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@lishop/contracts';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReturnsService } from '../returns/returns.service';
import { UpdateReturnStatusDto } from '../returns/dto/update-return-status.dto';
import { SupportTicketsService } from '../support/support-tickets.service';
import { FaqService } from '../support/faq.service';
import { UpdateTicketStatusDto } from '../support/dto/update-ticket-status.dto';
import { AddMessageDto } from '../support/dto/add-message.dto';
import { CreateFaqDto } from '../support/dto/create-faq.dto';
import { UpdateFaqDto } from '../support/dto/update-faq.dto';
import { TicketStatus } from '@lishop/database';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly returnsService: ReturnsService,
    private readonly ticketsService: SupportTicketsService,
    private readonly faqService: FaqService,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders' })
  listOrders() {
    return this.adminService.listOrders();
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Update order status' })
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.adminService.updateOrderStatus(id, dto.status);
  }

  @Post('orders/:id/tracking')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a tracking event to an order shipment' })
  addTrackingEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddTrackingEventDto,
  ) {
    return this.adminService.addTrackingEvent(id, dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('coupons')
  @ApiOperation({ summary: 'List all coupons' })
  listCoupons() {
    return this.adminService.listCoupons();
  }

  @Post('coupons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new coupon' })
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.adminService.createCoupon(dto);
  }

  @Patch('coupons/:id/toggle')
  @ApiOperation({ summary: 'Toggle coupon active/inactive' })
  toggleCoupon(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.toggleCoupon(id);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get revenue and top products analytics' })
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  @Get('returns')
  @ApiOperation({ summary: 'List all return requests' })
  getAllReturns() {
    return this.returnsService.getAllReturns();
  }

  @Patch('returns/:id/status')
  @ApiOperation({ summary: 'Update return request status' })
  updateReturnStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReturnStatusDto,
  ) {
    return this.returnsService.updateReturnStatus(id, dto);
  }

  // ---- Support tickets ----

  @Get('tickets')
  @ApiOperation({ summary: 'List all support tickets' })
  getAllTickets(@Query('status') status?: TicketStatus) {
    return this.ticketsService.getAllTickets(status);
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket status' })
  updateTicketStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateTicketStatus(id, dto);
  }

  @Post('tickets/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin reply to a ticket' })
  addTicketMessage(
    @CurrentUser('id') adminId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMessageDto,
  ) {
    return this.ticketsService.addAdminMessage(adminId, id, dto);
  }

  // ---- FAQ ----

  @Get('faq')
  @ApiOperation({ summary: 'List all FAQs (including unpublished)' })
  getAllFaq() {
    return this.faqService.findAll();
  }

  @Post('faq')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a FAQ' })
  createFaq(@Body() dto: CreateFaqDto) {
    return this.faqService.create(dto);
  }

  @Patch('faq/:id')
  @ApiOperation({ summary: 'Update a FAQ' })
  updateFaq(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.faqService.update(id, dto);
  }

  @Delete('faq/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a FAQ' })
  deleteFaq(@Param('id', ParseUUIDPipe) id: string) {
    return this.faqService.delete(id);
  }
}
