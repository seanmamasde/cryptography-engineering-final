/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.mjs");
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,

  /**
   * If you are using `appDir` then you must comment the below `i18n` config out.
   *
   * @see https://github.com/vercel/next.js/issues/41980
   */
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  images: {
    domains: ["firebasestorage.googleapis.com", "lh3.googleusercontent.com"],
  },
  webpack: (cfg) => {
    cfg.resolve.fallback = {
      ...(cfg.resolve.fallback || {}),
      buffer: require.resolve("buffer/"), // poly-fill
    };
    return cfg;
  },
};

export default config;
