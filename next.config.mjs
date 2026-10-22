/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "a.espncdn.com" },
      { protocol: "https", hostname: "cdn.nba.com" },
    ],
  },
  // NBA.com data synced by sync/sync_nba.py is read from disk at request time,
  // so ship it with the serverless functions.
  outputFileTracingIncludes: {
    "/**/*": ["./data/nba/**/*"],
  },
};

export default nextConfig;
