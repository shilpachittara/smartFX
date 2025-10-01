/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ✅ do not fail the build on lint errors (Vercel/CI)
    ignoreDuringBuilds: true,
  },
};

export default nextConfig; 