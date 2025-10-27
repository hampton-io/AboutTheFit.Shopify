import { vercelPreset } from "@vercel/react-router/vite";
import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  presets: [vercelPreset()],
  // Include Prisma WASM files in Vercel deployment
  serverModuleFormat: "esm",
} satisfies Config;

