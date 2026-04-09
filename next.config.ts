import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/alice-web-wallet",
  assetPrefix: "/alice-web-wallet/",
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: resolve(import.meta.dirname ?? "."),
  },
};

export default nextConfig;
