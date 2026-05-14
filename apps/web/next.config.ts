import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { validateWebProductionEnvironment } from "./config/production-env";

const monorepoEnvPath = resolve(process.cwd(), "../..", ".env");

if (existsSync(monorepoEnvPath)) {
  loadEnvFile(monorepoEnvPath);
}

validateWebProductionEnvironment();

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
