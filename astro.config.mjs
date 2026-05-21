// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: "https://viewsuite.github.io",
    build: {
        assets: "_astro"
    },
    server: {
        allowedHosts: ['.lhr.life', '.trycloudflare.com', '.ngrok-free.app', '.ngrok.app']
    },
    vite: {
        server: {
            allowedHosts: ['.lhr.life', '.trycloudflare.com', '.ngrok-free.app', '.ngrok.app']
        }
    }
});
