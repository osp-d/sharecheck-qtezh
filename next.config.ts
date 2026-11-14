import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: { useTypeScriptCli: false },
};

export default nextConfig;
