// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

// Served via GitHub Pages at the custom domain japantrip2026.io (see public/CNAME).
export default defineConfig({
  site: 'https://japantrip2026.io',
  integrations: [react()],
});