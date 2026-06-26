import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@lishop/contracts';
import { ShopStatus } from '@lishop/database';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductListQueryDto } from './dto/product-list-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ShopsService } from '../shops/shops.service';

@ApiTags('seller / products')
@Controller('seller/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SELLER)
@ApiBearerAuth()
export class SellerProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly shopsService: ShopsService,
  ) {}

  private async assertShopApproved(userId: string): Promise<string> {
    const shop = await this.shopsService.getMyShop(userId);
    if (shop.status !== ShopStatus.APPROVED) {
      throw new ForbiddenException('Cửa hàng chưa được duyệt');
    }
    return shop.id;
  }

  @Get()
  @ApiOperation({ summary: 'List my shop products' })
  async findMyProducts(
    @CurrentUser('id') userId: string,
    @Query() query: ProductListQueryDto,
  ) {
    const shopId = await this.assertShopApproved(userId);
    return this.productsService.findMany({ ...query, shopId });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a product for my shop' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    const shopId = await this.assertShopApproved(userId);
    return this.productsService.create({ ...dto, shopId });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product in my shop' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    const shopId = await this.assertShopApproved(userId);
    const product = await this.productsService.findById(id);
    if (product.shopId !== shopId) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product from my shop' })
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const shopId = await this.assertShopApproved(userId);
    const product = await this.productsService.findById(id);
    if (product.shopId !== shopId) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }
    await this.productsService.delete(id);
  }
}
