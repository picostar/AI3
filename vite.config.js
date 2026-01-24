import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    base: '/AI3/', // GitHub Pages base path
    plugins: [
        nodePolyfills({
            // Enable polyfills for Node.js built-ins needed by @autonomys/auto-drive
            include: ['buffer', 'stream', 'util', 'events', 'process', 'path'],
            globals: {
                Buffer: true,
                global: true,
                process: true,
            },
        }),
    ],
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                stats: 'stats.html',
                explore: 'explore.html',
            },
        },
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
        },
    },
});
