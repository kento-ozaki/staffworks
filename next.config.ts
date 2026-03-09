// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/app/staffworks",
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: "/app/staffworks",
  },
};
export default nextConfig;