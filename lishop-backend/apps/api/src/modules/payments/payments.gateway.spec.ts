import { PaymentsGatewayService } from './payments.gateway';

describe('PaymentsGatewayService', () => {
  const originalEnv = process.env;
  let service: PaymentsGatewayService;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env['VNPAY_TMN_CODE'];
    delete process.env['VNPAY_HASH_SECRET'];
    delete process.env['VNPAY_URL'];
    delete process.env['VNPAY_RETURN_URL'];
    delete process.env['MOMO_PARTNER_CODE'];
    delete process.env['MOMO_ACCESS_KEY'];
    delete process.env['MOMO_SECRET_KEY'];
    delete process.env['MOMO_ENDPOINT'];
    delete process.env['PAYMENT_MOCK_RETURN_URL'];
    service = new PaymentsGatewayService();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('uses the local checkout payment simulator URL for VNPay when demo credentials are active', () => {
    const url = new URL(
      service.generateVNPayUrl(
        '11111111-2222-3333-4444-555555555555',
        120000,
        'Thanh toan don hang #LS-001',
        '127.0.0.1',
      ),
    );

    expect(`${url.origin}${url.pathname}`).toBe('http://localhost:3004/checkout/payment-simulator');
    expect(url.searchParams.get('orderId')).toBe('11111111-2222-3333-4444-555555555555');
    expect(url.searchParams.get('method')).toBe('VNPAY');
  });

  it('uses the local checkout payment simulator URL for MoMo when demo credentials are active', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await service.generateMoMoUrl(
      '11111111-2222-3333-4444-555555555555',
      120000,
    );
    const url = new URL(result.payUrl);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(`${url.origin}${url.pathname}`).toBe('http://localhost:3004/checkout/payment-simulator');
    expect(url.searchParams.get('orderId')).toBe('11111111-2222-3333-4444-555555555555');
    expect(url.searchParams.get('method')).toBe('MOMO');
  });

  it('uses the local checkout payment simulator URL for ZaloPay when demo credentials are active', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await service.generateZaloPayUrl(
      '11111111-2222-3333-4444-555555555555',
      120000,
    );
    const url = new URL(result.orderUrl);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(`${url.origin}${url.pathname}`).toBe('http://localhost:3004/checkout/payment-simulator');
    expect(url.searchParams.get('orderId')).toBe('11111111-2222-3333-4444-555555555555');
    expect(url.searchParams.get('method')).toBe('ZALOPAY');
  });
});
