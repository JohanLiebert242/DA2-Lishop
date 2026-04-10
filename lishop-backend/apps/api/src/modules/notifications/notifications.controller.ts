import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { UpsertPreferenceDto } from './dto/upsert-preference.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  getPreferences(@CurrentUser() user: { id: string }) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Put('preferences/:eventType')
  @ApiOperation({ summary: 'Upsert notification preference for an event type' })
  upsertPreference(
    @CurrentUser() user: { id: string },
    @Param('eventType') eventType: string,
    @Body() dto: UpsertPreferenceDto,
  ) {
    return this.notificationsService.upsertPreference(user.id, eventType, dto);
  }
}
