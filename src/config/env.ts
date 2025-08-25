// src/config/env.ts
import dotenv from "dotenv";
dotenv.config();

/**
 * Helper: lees env variabelen en gooi een fout als ze ontbreken.
 */
const required = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInt(process.env.PORT ?? "3000", 10),

  // CORS
  ALLOWED_ORIGINS: (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
    .split(",")
    .map((s) => s.trim()),

  // Microsoft Entra ID / Azure AD App Registration
  AZURE_CLIENT_ID: required("AZURE_CLIENT_ID"),
  AZURE_TENANT_ID: required("AZURE_TENANT_ID", "common"),
  AZURE_CLIENT_SECRET: process.env.AZURE_CLIENT_SECRET, // optioneel (alleen confidential flow)

  // Eigen app settings
  SESSION_SALT: required("SESSION_SALT", "dev-salt"),
};
