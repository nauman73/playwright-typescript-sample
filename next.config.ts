import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js writes its own agent instruction files by default. This repo does not use them.
  agentRules: false,
};

export default nextConfig;
