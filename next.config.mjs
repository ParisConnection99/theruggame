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
    // Add support for importing CSS files (if not already handled)
  }
  
  export default nextConfig;
  