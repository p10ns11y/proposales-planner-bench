import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: {
    "/api/chat": ["./src/contract/openapi.json"],
    "/api/session": ["./src/contract/openapi.json"],
    "/api/turn": ["./src/contract/openapi.json"],
  },
};

export default nextConfig;
