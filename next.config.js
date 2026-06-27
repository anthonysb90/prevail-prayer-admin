/** @type {import('next').NextConfig} */
const nextConfig = {
  // Audio uploads (Music manager) post the file through a Server Action;
  // the default body limit is 1 MB, so raise it to fit a ~30 MB track.
  experimental: {
    serverActions: { bodySizeLimit: "32mb" },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "*.supabase.in" },
    ],
  },
};

module.exports = nextConfig;
