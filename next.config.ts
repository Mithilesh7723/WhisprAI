
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'explicit-amethyst-719oaao61c.edgeone.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'content-salmon-9kdjzn7oyh.edgeone.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
