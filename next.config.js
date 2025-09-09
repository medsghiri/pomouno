/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize bundle for better performance
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

module.exports = nextConfig;
