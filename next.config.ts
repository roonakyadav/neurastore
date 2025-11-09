import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
  },
  reactStrictMode: true,
  compiler: {
    removeConsole: { exclude: ['error'] },
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.infrastructureLogging = { level: 'error' };
    }
    return config;
  },
  turbopack: {},
};

export default nextConfig;
