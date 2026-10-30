import fs from 'fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT || '3000';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';

// Canonical origin used for sitemap/llms.txt/OG URLs. Prefer an explicit
// PUBLIC_SITE_URL, then the first production Replit domain, then the dev
// domain. An unresolved origin leaves build-time URLs root-relative; the app
// still upgrades them to window.location.origin at runtime.
const publicSiteUrl = (() => {
  const explicit = process.env.PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const productionDomain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim();
  if (productionDomain) return `https://${productionDomain}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN?.trim();
  if (devDomain) return `https://${devDomain}`;
  return '';
})();

const siteRoutes = [
  '/',
  '/scanner',
  '/wifi-qr-code-generator',
  '/vcard-qr-code-generator',
  '/whatsapp-qr-code-generator',
  '/code128-barcode-generator',
  '/printable-label-sheet',
  '/privacy-policy',
  '/terms-of-service',
  '/about-us',
  '/contact',
];

function withBase(route: string) {
  const prefix =
    basePath === '/' ? '' : `/${basePath.replace(/^\/+|\/+$/g, '')}`;
  return route === '/' ? `${prefix}/` : `${prefix}${route}`;
}

function siteFilesPlugin(): Plugin {
  let outDir = '';
  let isBuild = false;

  return {
    name: 'utilitycodes-site-files',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      isBuild = config.command === 'build';
    },
    transformIndexHtml(html) {
      const renderOrigin = publicSiteUrl || (isBuild ? '' : `http://localhost:${port}`);
      return html.replaceAll('%SITE_URL%', renderOrigin);
    },
    closeBundle() {
      if (!isBuild) return;

      // Sitemap only ships when a real origin is known; a localhost or
      // root-relative sitemap would advertise URLs search engines cannot use.
      if (publicSiteUrl) {
        // Bump when page copy changes; do not use the build clock, which would
        // tell crawlers every deploy changed every page.
        const lastReviewed = '2026-10-30';
        const urls = siteRoutes
          .map((route) => {
            const priority =
              route === '/' ? '1.0' : route === '/scanner' ? '0.9' : '0.7';
            const changefreq = route === '/' ? 'weekly' : 'monthly';
            return `  <url>\n    <loc>${publicSiteUrl}${withBase(route)}</loc>\n    <lastmod>${lastReviewed}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
          })
          .join('\n');
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap, 'utf8');

        const robotsSource = path.join(import.meta.dirname, 'public', 'robots.txt');
        const robots = fs.existsSync(robotsSource)
          ? fs.readFileSync(robotsSource, 'utf8')
          : 'User-agent: *\nAllow: /\n';
        fs.writeFileSync(
          path.join(outDir, 'robots.txt'),
          `${robots.trimEnd()}\n\nSitemap: ${publicSiteUrl}${withBase('/sitemap.xml')}\n`,
          'utf8',
        );
      }

      // llms.txt is authored with %SITE_URL% tokens so the same source works
      // on deployment and in local previews (where links stay root-relative).
      const llmsSource = path.join(import.meta.dirname, 'public', 'llms.txt');
      if (fs.existsSync(llmsSource)) {
        const llms = fs
          .readFileSync(llmsSource, 'utf8')
          .replaceAll('%SITE_URL%', publicSiteUrl);
        fs.writeFileSync(path.join(outDir, 'llms.txt'), llms, 'utf8');
      }
    },
  };
}

export default defineConfig({
  base: basePath,
  define: {
    __PUBLIC_SITE_URL__: JSON.stringify(publicSiteUrl),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    siteFilesPlugin(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    watch: {
      // OneDrive can hold a write-lock on freshly downloaded binary assets,
      // which crashes the chokidar watcher (EBUSY). Static fonts never
      // change content, so watching them is pointless.
      ignored: ['**/public/fonts/**'],
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
