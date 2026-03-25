import type { NextConfig } from 'next';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

const nextConfig: NextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'shell',
        remotes: {
          mfeAuth: `mfeAuth@${process.env.NEXT_PUBLIC_MFE_AUTH_URL}/_next/static/chunks/remoteEntry.js`,
          mfeCatalog: `mfeCatalog@${process.env.NEXT_PUBLIC_MFE_CATALOG_URL}/_next/static/chunks/remoteEntry.js`,
          mfeCart: `mfeCart@${process.env.NEXT_PUBLIC_MFE_CART_URL}/_next/static/chunks/remoteEntry.js`,
          mfeCheckout: `mfeCheckout@${process.env.NEXT_PUBLIC_MFE_CHECKOUT_URL}/_next/static/chunks/remoteEntry.js`,
          mfeOrders: `mfeOrders@${process.env.NEXT_PUBLIC_MFE_ORDERS_URL}/_next/static/chunks/remoteEntry.js`,
          mfeProfile: `mfeProfile@${process.env.NEXT_PUBLIC_MFE_PROFILE_URL}/_next/static/chunks/remoteEntry.js`,
          mfePromotions: `mfePromotions@${process.env.NEXT_PUBLIC_MFE_PROMOTIONS_URL}/_next/static/chunks/remoteEntry.js`,
          mfeNotifications: `mfeNotifications@${process.env.NEXT_PUBLIC_MFE_NOTIFICATIONS_URL}/_next/static/chunks/remoteEntry.js`,
          mfeAdmin: `mfeAdmin@${process.env.NEXT_PUBLIC_MFE_ADMIN_URL}/_next/static/chunks/remoteEntry.js`,
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
