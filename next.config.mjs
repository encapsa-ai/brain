/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.BRAIN_STATIC_EXPORT === '1' ? { output: 'export', trailingSlash: true } : {}),
  devIndicators: false,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
