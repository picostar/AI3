import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
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
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis',
            },
        },
    },
});
