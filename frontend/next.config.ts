import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  serverExternalPackages: [
    "@aws-sdk/client-s3",
    "import-in-the-middle",
    "require-in-the-middle",
  ],
};

export default nextConfig;
