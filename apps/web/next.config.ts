import type { NextConfig } from "next";
import { validateWebProductionEnvironment } from "./config/production-env";

validateWebProductionEnvironment();

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
