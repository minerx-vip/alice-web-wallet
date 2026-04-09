import type { NextConfig } from "next";
import { resolve } from "path";

const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isProd ? "/alice-web-wallet" : undefined,
  assetPrefix: isProd ? "/alice-web-wallet/" : undefined,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: resolve(import.meta.dirname ?? "."),
  },
};

export default nextConfig;
