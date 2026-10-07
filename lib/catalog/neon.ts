import { neon } from "@neondatabase/serverless";

/**
 * Server-side Neon client for the Stage 5+ catalogue.
 * Do not import this module into client components.
 */
export function getCatalogDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return neon(connectionString);
}
