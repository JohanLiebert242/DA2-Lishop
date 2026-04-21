import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReturnsService } from './returns.service';
import { CreateReturnDto } from './dto/create-return.dto';

@ApiTags('returns')
@Controller('returns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a return request' })
  createReturn(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReturnDto,
  ) {
    return this.returnsService.createReturn(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get my return requests' })
  getMyReturns(@CurrentUser('id') userId: string) {
    return this.returnsService.getMyReturns(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single return request' })
  getMyReturn(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.getMyReturn(userId, id);
  }
}
