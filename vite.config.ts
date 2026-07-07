import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    // Local Portal (services.json) に登録済みの割り当てポート
    port: 2629
  }
});
