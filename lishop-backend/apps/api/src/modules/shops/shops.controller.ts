import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  forwardRef,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ProductsService } from '../products/products.service';
import { ProductListQueryDto } from '../products/dto/product-list-query.dto';
import { RedisService } from '../redis/redis.service';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  constructor(
    private readonly shopsService: ShopsService,
    @Inject(forwardRef(() => ProductsService))
    private readonly productsService: ProductsService,
    private readonly redisService: RedisService,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new shop (seller onboarding)' })
  register(@CurrentUser('id') userId: string, @Body() dto: CreateShopDto) {
    return this.shopsService.register(userId, dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user shop' })
  getMyShop(@CurrentUser('id') userId: string) {
    return this.shopsService.getMyShop(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user shop' })
  updateShop(@CurrentUser('id') userId: string, @Body() dto: UpdateShopDto) {
    return this.shopsService.updateShop(userId, dto);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get a shop by slug (public)' })
  getShopBySlug(@Param('slug') slug: string) {
    return this.shopsService.getShopBySlug(slug);
  }

  @Get(':slug/online')
  @Public()
  @ApiOperation({ summary: 'Check if a shop is online (seller connected via WebSocket)' })
  async getShopOnline(@Param('slug') slug: string) {
    const shop = await this.shopsService.getShopBySlug(slug);
    const online = await this.redisService.exists(`presence:shop:${shop.id}`);
    return { online, shopId: shop.id };
  }

  @Get(':slug/products')
  @Public()
  @ApiOperation({ summary: 'Get products of a shop by slug (public)' })
  async getShopProducts(
    @Param('slug') slug: string,
    @Query() query: ProductListQueryDto,
  ) {
    const shop = await this.shopsService.getShopBySlug(slug);
    return this.productsService.findMany({ ...query, shopId: shop.id });
  }
}
