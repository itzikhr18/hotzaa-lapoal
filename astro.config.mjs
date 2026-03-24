import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
export default defineConfig({
  site: 'https://hotzaa-lapoal.info',
  integrations: [
    react(),
    tailwind(),
  ],
  output: 'static',
});
