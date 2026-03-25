import type { NextConfig } from 'next';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { NextFederationPlugin } = require('@module-federation/nextjs-mf');

const nextConfig: NextConfig = {
  webpack(config, options) {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'mfeAuth',
        filename: 'static/chunks/remoteEntry.js',
        exposes: {
          './LoginPage': './src/app/login/page',
          './RegisterPage': './src/app/register/page',
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
