import { Injectable } from '@nestjs/common';

export type ShippingProvider = 'GHN' | 'GHTK' | 'VIETTEL_POST';

export interface ShippingOption {
  provider: ShippingProvider;
  name: string;
  feeVnd: number;
  estimatedDays: string;
}

type Zone = 1 | 2 | 3;

interface ProviderConfig {
  provider: ShippingProvider;
  name: string;
  baseFeeZone1: number;
  perUnitFee: number;
  estimatedDaysByZone: Record<Zone, string>;
}

const ZONE_ADD: Record<Zone, number> = {
  1: 0,
  2: 5000,
  3: 15000,
};

const PROVIDERS: ProviderConfig[] = [
  {
    provider: 'GHN',
    name: 'Giao Hàng Nhanh',
    baseFeeZone1: 22000,
    perUnitFee: 3000,
    estimatedDaysByZone: { 1: '1-2 ngày', 2: '2-3 ngày', 3: '3-5 ngày' },
  },
  {
    provider: 'GHTK',
    name: 'Giao Hàng Tiết Kiệm',
    baseFeeZone1: 20000,
    perUnitFee: 2500,
    estimatedDaysByZone: { 1: '2-3 ngày', 2: '3-4 ngày', 3: '4-6 ngày' },
  },
  {
    provider: 'VIETTEL_POST',
    name: 'Viettel Post',
    baseFeeZone1: 18000,
    perUnitFee: 2000,
    estimatedDaysByZone: { 1: '2-4 ngày', 2: '3-5 ngày', 3: '5-7 ngày' },
  },
];

const ZONE1_KEYWORDS = ['hà nội', 'hồ chí minh', 'ho chi minh', 'hanoi', 'hcm', 'ha noi'];
const ZONE2_KEYWORDS = [
  'đà nẵng',
  'cần thơ',
  'hải phòng',
  'da nang',
  'can tho',
  'hai phong',
  'bình dương',
  'đồng nai',
];

@Injectable()
export class ShippingService {
  private getZone(cityName: string): Zone {
    const lower = cityName.toLowerCase();
    if (ZONE1_KEYWORDS.some((k) => lower.includes(k))) return 1;
    if (ZONE2_KEYWORDS.some((k) => lower.includes(k))) return 2;
    return 3;
  }

  calculateFee(cityName: string, provider: ShippingProvider, weightGrams: number): number {
    const zone = this.getZone(cityName);
    const config = PROVIDERS.find((p) => p.provider === provider);
    if (!config) return 0;

    const extraUnits = Math.ceil(weightGrams / 500) - 1;
    const baseFee = config.baseFeeZone1 + ZONE_ADD[zone];
    return baseFee + extraUnits * config.perUnitFee;
  }

  calculateRates(cityName: string, weightGrams: number): ShippingOption[] {
    const zone = this.getZone(cityName);
    const extraUnits = Math.ceil(weightGrams / 500) - 1;

    return PROVIDERS.map((config) => {
      const baseFee = config.baseFeeZone1 + ZONE_ADD[zone];
      const feeVnd = baseFee + extraUnits * config.perUnitFee;
      return {
        provider: config.provider,
        name: config.name,
        feeVnd,
        estimatedDays: config.estimatedDaysByZone[zone],
      };
    });
  }
}
