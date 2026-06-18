import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'fs';
import path from 'path';

// Read parent package metadata so the imported web-multiselect source can
// resolve the build-time constants its logger references.
const parentPkg = JSON.parse(readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));

// Standalone Svelte 5 sandbox for verifying single-select event behavior of
// <web-multiselect>. Imports the component straight from the parent package
// source via an alias so we don't have to install the local tarball.
export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 12400,
    fs: { allow: ['..'] }
  },
  resolve: {
    alias: {
      '@keenmate/web-multiselect': path.resolve(__dirname, '../src/index.ts')
    }
  },
  define: {
    '__VERSION__': JSON.stringify(parentPkg.version),
    '__PACKAGE_NAME__': JSON.stringify(parentPkg.name),
    '__AUTHOR__': JSON.stringify(parentPkg.author),
    '__LICENSE__': JSON.stringify(parentPkg.license),
    '__REPOSITORY__': JSON.stringify(parentPkg.repository?.url ?? ''),
    '__HOMEPAGE__': JSON.stringify(parentPkg.homepage ?? '')
  }
});
