/**
 * Reads amplify_outputs.json (written by `ampx pipeline-deploy`) and appends
 * PUBLIC_CONTACT_API_URL to .env so Astro can inject it at build time.
 * Safe to run when the file doesn't exist (local builds without backend).
 */
import { existsSync, readFileSync, appendFileSync } from "node:fs";

const OUTPUTS = "amplify_outputs.json";

if (!existsSync(OUTPUTS)) {
  console.log("No amplify_outputs.json — skipping contact API env injection");
  process.exit(0);
}

const outputs = JSON.parse(readFileSync(OUTPUTS, "utf-8"));
const url = outputs?.custom?.contactApiUrl;

if (typeof url !== "string" || !url.startsWith("https://")) {
  console.warn("amplify_outputs.json has no custom.contactApiUrl — skipping");
  process.exit(0);
}

appendFileSync(".env", `\nPUBLIC_CONTACT_API_URL=${url}\n`);
console.log(`Injected PUBLIC_CONTACT_API_URL=${url}`);
