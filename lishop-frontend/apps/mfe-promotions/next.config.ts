import type { NextConfig } from 'next';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

const nextConfig: NextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'mfePromotions',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './PromotionsPage': './src/app/promotions/page',
          './CouponWidget': './src/components/coupon-widget',
          './FlashSaleBanner': './src/components/flash-sale-banner',
        },
        shared: {
          react: { singleton: true, requiredVersion: false },
          'react-dom': { singleton: true, requiredVersion: false },
          zustand: { singleton: true },
        },
      })
    );
    return config;
  },
};

export default nextConfig;
