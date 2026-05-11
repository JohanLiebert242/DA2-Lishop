import { ShippingService } from './shipping.service';

describe('ShippingService', () => {
  let service: ShippingService;

  beforeEach(() => {
    service = new ShippingService();
  });

  describe('calculateFee', () => {
    it('returns zone-1 base fee for HCM + GHN + 500g', () => {
      const fee = service.calculateFee('Hồ Chí Minh', 'GHN', 500);
      expect(fee).toBe(22000);
    });

    it('returns zone-1 base fee for Hanoi + GHN + 500g', () => {
      const fee = service.calculateFee('Hà Nội', 'GHN', 500);
      expect(fee).toBe(22000);
    });

    it('adds zone-2 surcharge for Đà Nẵng', () => {
      const fee = service.calculateFee('Đà Nẵng', 'GHN', 500);
      expect(fee).toBe(22000 + 5000);
    });

    it('adds zone-3 surcharge for unknown city', () => {
      const fee = service.calculateFee('Lào Cai', 'GHN', 500);
      expect(fee).toBe(22000 + 15000);
    });

    it('adds per-unit fee for weight over 500g', () => {
      // 1000g = 2 units, 1 extra unit × 3000 = 3000
      const fee = service.calculateFee('Hồ Chí Minh', 'GHN', 1000);
      expect(fee).toBe(22000 + 3000);
    });

    it('returns 0 for unknown provider', () => {
      const fee = service.calculateFee('Hồ Chí Minh', 'UNKNOWN' as never, 500);
      expect(fee).toBe(0);
    });

    it('uses GHTK base fee', () => {
      const fee = service.calculateFee('Hồ Chí Minh', 'GHTK', 500);
      expect(fee).toBe(20000);
    });

    it('uses VIETTEL_POST base fee', () => {
      const fee = service.calculateFee('Hồ Chí Minh', 'VIETTEL_POST', 500);
      expect(fee).toBe(18000);
    });
  });

  describe('calculateRates', () => {
    it('returns rates for all 3 providers', () => {
      const rates = service.calculateRates('Hồ Chí Minh', 500);
      expect(rates).toHaveLength(3);
      const providers = rates.map((r) => r.provider);
      expect(providers).toContain('GHN');
      expect(providers).toContain('GHTK');
      expect(providers).toContain('VIETTEL_POST');
    });

    it('includes estimated days for zone-1 GHN', () => {
      const rates = service.calculateRates('Hà Nội', 500);
      const ghn = rates.find((r) => r.provider === 'GHN')!;
      expect(ghn.estimatedDays).toBe('1-2 ngày');
    });

    it('includes estimated days for zone-2 GHN', () => {
      const rates = service.calculateRates('Đà Nẵng', 500);
      const ghn = rates.find((r) => r.provider === 'GHN')!;
      expect(ghn.estimatedDays).toBe('2-3 ngày');
    });

    it('calculates correct feeVnd for each provider', () => {
      const rates = service.calculateRates('Hồ Chí Minh', 500);
      const ghn = rates.find((r) => r.provider === 'GHN')!;
      const ghtk = rates.find((r) => r.provider === 'GHTK')!;
      const viettel = rates.find((r) => r.provider === 'VIETTEL_POST')!;
      expect(ghn.feeVnd).toBe(22000);
      expect(ghtk.feeVnd).toBe(20000);
      expect(viettel.feeVnd).toBe(18000);
    });
  });
});
