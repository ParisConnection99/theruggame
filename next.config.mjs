/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  compiler: {
    // Remove all console.* calls with no exceptions
    removeConsole: true,
  },

  // Enable Edge Runtime for middleware and API routes
  experimental: {
    runtime: 'experimental-edge',
    appDir: true, // if you're using the app directory
  },
  
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
}

export default nextConfig;