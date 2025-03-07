/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config, { isServer }) {
    // If we're on the client side, we need to handle the 'fs' module for certain packages
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      };
    }

    return config;
  },
  // Add the images configuration
  images: {
    domains: ['dd.dexscreener.com'],
  },
  
  // Add the redirects configuration for maintenance mode
  async redirects() {
    const maintenanceMode = process.env.MAINTENANCE_MODE === '1';
    
    if (maintenanceMode) {
      return [
        {
          source: '/((?!maintenance|_next/static|_next/image|favicon.ico).*)',
          destination: '/maintenance',
          permanent: false,
        },
      ];
    }
    
    return [];
  },
}

export default nextConfig;