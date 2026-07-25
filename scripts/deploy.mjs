// Deploy manual del monorepo Aura a GitHub Pages — sin GitHub Actions.
//
// Construye cada app con su `base` de subruta, las ensambla bajo una sola
// carpeta y publica esa carpeta a la rama `gh-pages` del repo `aura`.
// GitHub Pages (Settings → Pages → Branch: gh-pages /) las sirve en:
//
//   https://mamueljr.github.io/aura/            → hub (esta landing)
//   https://mamueljr.github.io/aura/home/       → Aura Home
//   https://mamueljr.github.io/aura/music/      → Aura Music
//   https://mamueljr.github.io/aura/weather/    → AuraWeather
//
// Uso:
//   pnpm deploy                 # las 3 apps
//   pnpm deploy home music      # solo algunas
//   node scripts/deploy.mjs --dry-run   # construye y ensambla, NO publica

import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ghpages from 'gh-pages';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.deploy');
const REPO = 'https://github.com/mamueljr/aura.git';

// Cada app: cómo construirla y dónde queda su salida.
const APPS = {
  home: { base: '/aura/home/', dist: 'apps/home/dist', filter: 'aura-home' },
  music: { base: '/aura/music/', dist: 'apps/music/dist', filter: 'aura-music' },
  weather: { base: '/aura/weather/', dist: 'apps/weather/www', filter: 'aura-weather' },
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wanted = args.filter((a) => !a.startsWith('--'));
const targets = wanted.length ? wanted : Object.keys(APPS);

for (const t of targets) {
  if (!APPS[t]) {
    console.error(`✗ App desconocida: "${t}". Válidas: ${Object.keys(APPS).join(', ')}`);
    process.exit(1);
  }
}

function run(cmd, env = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } });
}

// 1. Construir cada app con su base de subruta.
for (const t of targets) {
  const { base, filter } = APPS[t];
  console.log(`\n=== build ${t} (base ${base}) ===`);
  run(`pnpm --filter ${filter} build`, { VITE_BASE: base });
}

// 2. Ensamblar la carpeta de publicación.
console.log('\n=== ensamblando .deploy/ ===');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

for (const t of targets) {
  const src = path.join(ROOT, APPS[t].dist);
  if (!existsSync(src)) {
    console.error(`✗ No existe la salida de ${t}: ${src}`);
    process.exit(1);
  }
  const dest = path.join(OUT, t);
  cpSync(src, dest, { recursive: true });
  // Fallback SPA: GitHub Pages solo usa el 404 de la RAÍZ del sitio, así que
  // este 404 por-app no lo sirve Pages automáticamente, pero no estorba y sirve
  // si en el futuro se sube cada app a su propio repo.
  const idx = path.join(dest, 'index.html');
  if (existsSync(idx)) cpSync(idx, path.join(dest, '404.html'));
  console.log(`  ✓ ${t} → .deploy/${t}/`);
}

// 3. Marcadores + hub + 404 raíz.
writeFileSync(path.join(OUT, '.nojekyll'), '');

const links = targets
  .map((t) => {
    const label = { home: 'Aura Home', music: 'Aura Music', weather: 'AuraWeather' }[t];
    const desc = {
      home: 'El centro de tu hogar: pagos, tareas, calendario.',
      music: 'Reproductor offline-first para tu biblioteca local.',
      weather: 'Clima premium.',
    }[t];
    return `<a class="card" href="./${t}/"><h2>${label}</h2><p>${desc}</p></a>`;
  })
  .join('\n      ');

const hub = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Aura — Ecosistema</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-content: center; gap: 2rem;
    padding: 2rem; font-family: system-ui, -apple-system, sans-serif;
    background: #0b0b12; color: #f4f4f8; }
  header { text-align: center; }
  h1 { font-size: clamp(2rem, 6vw, 3rem); margin: 0 0 .3rem;
    background: linear-gradient(90deg,#a78bfa,#22d3ee,#f472b6);
    -webkit-background-clip: text; background-clip: text; color: transparent; }
  header p { margin: 0; opacity: .6; }
  .grid { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit,minmax(220px,1fr));
    max-width: 760px; }
  .card { display: block; padding: 1.4rem 1.5rem; border-radius: 1rem; text-decoration: none;
    color: inherit; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
    transition: transform .15s ease, background .15s ease; }
  .card:hover { transform: translateY(-3px); background: rgba(255,255,255,.09); }
  .card h2 { margin: 0 0 .3rem; font-size: 1.15rem; }
  .card p { margin: 0; opacity: .65; font-size: .9rem; line-height: 1.4; }
</style>
</head>
<body>
  <header>
    <h1>Aura</h1>
    <p>Ecosistema local-first</p>
  </header>
  <main class="grid">
      ${links}
  </main>
</body>
</html>
`;
writeFileSync(path.join(OUT, 'index.html'), hub);

// 404 de la raíz del sitio: Pages lo sirve para CUALQUIER ruta inexistente.
// Redirige rutas profundas de una app a la raíz de esa app (la ruta interna se
// pierde, pero la app carga sin error 404); lo demás cae al hub.
const notFound = `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<script>
  (function () {
    var m = location.pathname.match(/^(\\/aura\\/(home|music|weather))(\\/|$)/);
    location.replace(m ? m[1] + '/' + location.hash : '/aura/');
  })();
</script>
</head><body></body></html>
`;
writeFileSync(path.join(OUT, '404.html'), notFound);
console.log('  ✓ hub, 404.html y .nojekyll');

// 4. Publicar (o parar en dry-run).
if (dryRun) {
  console.log(`\n[dry-run] listo en ${OUT} — no se publicó nada.`);
  process.exit(0);
}

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
console.log(`\n=== publicando a ${REPO} (rama gh-pages) ===`);
ghpages.publish(
  OUT,
  {
    branch: 'gh-pages',
    repo: REPO,
    dotfiles: true, // incluir .nojekyll
    message: `deploy: ${targets.join(', ')} desde monorepo (${stamp})`,
    nojekyll: true,
  },
  (err) => {
    if (err) {
      console.error('\n✗ Falló la publicación:', err.message);
      process.exit(1);
    }
    console.log('\n✓ Publicado. GitHub Pages reconstruye en ~1 min.');
    console.log('  Hub:     https://mamueljr.github.io/aura/');
    for (const t of targets) console.log(`  ${t.padEnd(8)}https://mamueljr.github.io/aura/${t}/`);
  },
);
