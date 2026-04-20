import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WishlistService } from './wishlist.service';

@ApiTags('wishlist')
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getIds(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlistIds(userId);
  }

  @Get('products')
  async getProducts(@CurrentUser('id') userId: string) {
    return this.wishlistService.getWishlistProducts(userId);
  }

  @Post(':productId')
  @HttpCode(HttpStatus.CREATED)
  async add(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    await this.wishlistService.add(userId, productId);
    return { message: 'Added to wishlist' };
  }

  @Delete(':productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser('id') userId: string,
    @Param('productId') productId: string,
  ) {
    await this.wishlistService.remove(userId, productId);
  }
}
