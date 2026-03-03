import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";

const buildAt = new Date().toISOString();
const appVersion = process.env.VITE_APP_VERSION ?? process.env.npm_package_version ?? "0.0.0";

const parseBuildFromEnv = () => {
  const raw = process.env.VITE_BUILD_NUMBER;
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 101) return null;
  return Math.floor(parsed);
};

const computeSequentialBuild = () => {
  const fromEnv = parseBuildFromEnv();
  if (fromEnv !== null) return fromEnv;
  try {
    const count = Number(execSync("git rev-list --count HEAD").toString().trim());
    if (Number.isFinite(count) && count > 0) {
      return 100 + count;
    }
  } catch {
    // Fallback when git metadata is unavailable in CI/container.
  }
  return 101;
};

const buildNumber = computeSequentialBuild();

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_NUMBER__: JSON.stringify(String(buildNumber)),
    __APP_BUILD_AT__: JSON.stringify(buildAt)
  },
  server: {
    host: true,
    port: 5173
  }
});
