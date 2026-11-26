import { defineConfig } from 'vite';

export default defineConfig({
  // Deploy target is not decided yet; default to the user-site root ('/').
  // For a project site (e.g. https://<user>.github.io/<repo>/), change this
  // to the repo path, e.g. base: '/profile-page/'.
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
  },
});
