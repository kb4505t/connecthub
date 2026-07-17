/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // required for the slim production Dockerfile (Render deploy)
  images: {
    // Add Supabase Storage host here once the project is created, e.g.:
    // remotePatterns: [{ protocol: "https", hostname: "YOUR_PROJECT.supabase.co" }],
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // allow larger uploads for media
    },
  },
};

module.exports = nextConfig;
