import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Todas las páginas son dinámicas (force-dynamic), no hace falta caché incremental.
export default defineCloudflareConfig();
