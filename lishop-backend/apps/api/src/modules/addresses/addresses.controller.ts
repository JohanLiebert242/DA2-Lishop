import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user addresses' })
  async getAll(@CurrentUser('id') userId: string) {
    return this.addressesService.getAddresses(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new address' })
  async create(@CurrentUser('id') userId: string, @Body() dto: CreateAddressDto) {
    return this.addressesService.createAddress(userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an address' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.updateAddress(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an address' })
  async remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.addressesService.deleteAddress(userId, id);
  }

  @Patch(':id/default')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set address as default' })
  async setDefault(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.addressesService.setDefault(userId, id);
  }
}
