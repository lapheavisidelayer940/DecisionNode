import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const routes = [
    '/',
    '/terms',
    '/privacy',
    '/docs',
    '/docs/quickstart',
    '/docs/installation',
    '/docs/setup',
    '/docs/decisions',
    '/docs/mcp',
    '/docs/context',
    '/docs/workflows',
    '/docs/cli',
];

const distDir = path.resolve(__dirname, 'dist');
const template = fs.readFileSync(path.join(distDir, 'index.html'), 'utf-8');

const { render } = await import('./.ssr/entry-server.js');

for (const route of routes) {
    const { html: appHtml, helmet } = render(route);

    let pageHtml = template;

    // Replace title with page-specific one
    if (helmet?.title) {
        pageHtml = pageHtml.replace(/<title>[^<]*<\/title>/, helmet.title.toString());
    }

    // Remove generic description/canonical — helmet will inject page-specific ones
    pageHtml = pageHtml.replace(/<meta name="description"[^>]*\/?>\s*/g, '');
    pageHtml = pageHtml.replace(/<link rel="canonical"[^>]*\/?>\s*/g, '');

    // Inject page-specific helmet tags before </head>
    const headTags = [
        helmet?.meta?.toString() || '',
        helmet?.link?.toString() || '',
    ].filter(t => t.trim()).join('\n  ');

    if (headTags) {
        pageHtml = pageHtml.replace('</head>', `  ${headTags}\n</head>`);
    }

    // Inject pre-rendered app HTML
    pageHtml = pageHtml.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`);

    // Write index.html for this route
    const routeDir = route === '/' ? distDir : path.join(distDir, route);
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(routeDir, 'index.html'), pageHtml);

    console.log(`  ✓ ${route}`);
}

console.log('\nPre-rendering complete.');
