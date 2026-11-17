import dotenv from "dotenv";
import { loadConfig } from "./load-config.js";

// Machine-specific overrides (for example a local PostgreSQL URL) live in
// `.env.local` and take precedence over `.env`. Real process environment
// variables still win because dotenv does not overwrite them.
dotenv.config({ path: [".env.local", ".env"] });

export { loadConfig };
export const config = loadConfig();
