import type { NextConfig } from 'next';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

const nextConfig: NextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'mfeProfile',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './ProfilePage': './src/app/profile/page',
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
