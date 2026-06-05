import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (avoids Next picking up an unrelated
  // parent lockfile under the user's home directory).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
