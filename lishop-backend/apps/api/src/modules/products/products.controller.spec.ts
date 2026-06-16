import { APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { validationPipe } from '../../common/pipes/validation.pipe';
import { RolesGuard } from '../../common/guards/roles.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let app: NestFastifyApplication;
  const productsService = {
    recommendations: jest.fn(),
  };
  const allowGuard = { canActivate: () => true };

  beforeAll(async () => {
    const builder = Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: productsService },
        { provide: APP_PIPE, useValue: validationPipe },
      ],
    })
      .overrideGuard(OptionalJwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(JwtAuthGuard)
      .useValue(allowGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowGuard);

    const moduleRef = await builder.compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('accepts recommendations query params limit and context together', async () => {
    productsService.recommendations.mockResolvedValue({
      fallback: true,
      items: [],
    });

    const response = await app.inject({
      method: 'GET',
      url: '/products/recommendations?limit=8&context=products',
    });

    expect(response.statusCode).toBe(200);
    expect(productsService.recommendations).toHaveBeenCalledWith({
      userId: undefined,
      limit: 8,
      context: 'products',
    });
  });
});
