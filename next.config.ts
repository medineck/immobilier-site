import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  images: {
    // Optimisation désactivable en local uniquement (NEXT_IMAGES_UNOPTIMIZED=1 dans .env.local)
    unoptimized: process.env.NEXT_IMAGES_UNOPTIMIZED === "1",
    // Photos des annonces stockées dans Supabase
    remotePatterns: [new URL(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/**`)],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
