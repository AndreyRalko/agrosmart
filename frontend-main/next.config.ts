const backendUrl = process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8001';

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        // Django требует trailing slash; без него POST падает с APPEND_SLASH
        destination: `${backendUrl}/:path*/`,
      },
    ];
  },
};

module.exports = nextConfig;
