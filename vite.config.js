import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  base: '/ray-chat/' // Palitan ito ng eksaktong pangalan ng repo mo sa GitHub
});