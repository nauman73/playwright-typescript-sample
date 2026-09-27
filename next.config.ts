import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js writes its own agent instruction files by default. This repo does not use them.
  agentRules: false,
  // Hosts, other than localhost, from which next dev accepts its own dev resources, such as the
  // live-reload connection. Each entry is an IP address or a hostname, without scheme or port.
  // Without this, the app opened from another machine on the local network shows no sign-in form.
  // Next.js loads .env before this file, so the value can come from it.
  allowedDevOrigins: (process.env.DEV_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};

export default nextConfig;
