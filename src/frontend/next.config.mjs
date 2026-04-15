/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      fs: {},
      path: {},
    },
  },
  experimental: {
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Make Monaco Editor work with Next.js by falling back gracefully
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      }
    }
    return config
  },
}

export default nextConfig
