import { Module } from '@nestjs/common';
import { AddressesRepository } from './addresses.repository';
import { AddressesService } from './addresses.service';
import { AddressesController } from './addresses.controller';

@Module({
  providers: [AddressesRepository, AddressesService],
  controllers: [AddressesController],
  exports: [AddressesService, AddressesRepository],
})
export class AddressesModule {}
