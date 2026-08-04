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

// Cada app: cómo construirla, dónde queda su salida y cómo se presenta en el hub.
// El icono es el de la propia app, así se reconoce igual que en el escritorio.
const APPS = {
  home: {
    base: '/aura/home/',
    dist: 'apps/home/dist',
    filter: 'aura-home',
    label: 'Aura Home',
    desc: 'Tu hogar, organizado',
    icon: './home/icons/icon-192.png',
    tone: '#a78bfa',
  },
  music: {
    base: '/aura/music/',
    dist: 'apps/music/dist',
    filter: 'aura-music',
    label: 'Aura Music',
    desc: 'Tu música, siempre contigo',
    icon: './music/icons/icon-192.png',
    tone: '#22d3ee',
  },
  weather: {
    base: '/aura/weather/',
    dist: 'apps/weather/www',
    filter: 'aura-weather',
    label: 'AuraWeather',
    desc: 'El clima, al momento',
    icon: './weather/assets/icons/icon-192.png',
    tone: '#f472b6',
  },
  finance: {
    base: '/aura/finance/',
    dist: 'apps/finance/dist',
    filter: 'aura-finance',
    label: 'Aura Finance',
    desc: 'Tus finanzas, en orden',
    icon: './finance/icons/icon-192.png',
    tone: '#10b981',
  },
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
    const app = APPS[t];
    return `<a class="card" href="./${t}/" style="--tone:${app.tone}">
        <!-- Sin lazy: son el contenido principal y están arriba del todo;
             diferirlos solo retrasa lo primero que se ve. -->
        <img class="icon" src="${app.icon}" alt="" width="64" height="64" decoding="async" />
        <div class="body">
          <h2>${app.label}</h2>
          <p>${app.desc}</p>
        </div>
        <svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </a>`;
  })
  .join('\n      ');

const hub = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#0b0b12" />
<meta name="description" content="Aura — tus apps: hogar, música y clima. Funcionan sin internet." />
<title>Aura — Tus apps</title>
<link rel="icon" href="./home/icons/favicon.svg" />
<style>
  *, *::before, *::after { box-sizing: border-box; }

  body {
    margin: 0;
    min-height: 100dvh;
    padding: clamp(1.5rem, 5vw, 4rem) 1.25rem calc(2rem + env(safe-area-inset-bottom));
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: clamp(2rem, 6vw, 3.5rem);
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    color: #f4f4f8;
    background: #0b0b12;
    /* Halos de la paleta Aura: dan profundidad sin cargar la página. */
    background-image:
      radial-gradient(70ch 50ch at 15% -10%, rgba(167,139,250,.20), transparent 60%),
      radial-gradient(60ch 45ch at 95% 5%, rgba(34,211,238,.14), transparent 60%),
      radial-gradient(60ch 50ch at 50% 110%, rgba(244,114,182,.12), transparent 60%);
    background-attachment: fixed;
  }

  header { text-align: center; max-width: 34ch; }
  .wordmark {
    font-size: clamp(2.75rem, 13vw, 4.5rem); font-weight: 700; letter-spacing: -.04em;
    line-height: 1; margin: 0 0 .6rem;
    background: linear-gradient(100deg, #c4b5fd, #22d3ee 55%, #f472b6);
    -webkit-background-clip: text; background-clip: text; color: transparent;
  }
  header p { margin: 0; font-size: clamp(.95rem, 3.6vw, 1.05rem); line-height: 1.5; color: #b9b9c6; }

  main { display: grid; gap: .9rem; width: 100%; max-width: 30rem; }

  .card {
    position: relative; display: flex; align-items: center; gap: 1rem;
    padding: 1.1rem; border-radius: 1.35rem; text-decoration: none; color: inherit;
    background: rgba(255,255,255,.045);
    border: 1px solid rgba(255,255,255,.09);
    transition: background .18s ease, border-color .18s ease, transform .18s ease;
  }
  /* El tono de cada app tiñe su tarjeta lo justo para distinguirlas. */
  .card::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: linear-gradient(100deg, color-mix(in srgb, var(--tone) 12%, transparent), transparent 55%);
  }
  .card:hover, .card:focus-visible {
    background: rgba(255,255,255,.075);
    border-color: color-mix(in srgb, var(--tone) 45%, transparent);
    transform: translateY(-2px);
  }
  .card:focus-visible { outline: 2px solid var(--tone); outline-offset: 3px; }
  .card:active { transform: translateY(0); }

  .icon {
    position: relative; flex: 0 0 auto; width: 64px; height: 64px; border-radius: 1.1rem;
    box-shadow: 0 6px 20px -8px color-mix(in srgb, var(--tone) 80%, transparent);
  }
  .body { position: relative; min-width: 0; flex: 1; }
  .card h2 { margin: 0 0 .2rem; font-size: 1.15rem; font-weight: 600; letter-spacing: -.01em; }
  .card p { margin: 0; font-size: .9rem; line-height: 1.4; color: #a8a8b8; }

  .chev {
    position: relative; flex: 0 0 auto; width: 20px; height: 20px; fill: none;
    stroke: #6f6f80; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
    transition: stroke .18s ease, transform .18s ease;
  }
  .card:hover .chev { stroke: var(--tone); transform: translateX(2px); }

  footer { font-size: .8rem; color: #7c7c8c; text-align: center; }

  @media (prefers-reduced-motion: reduce) {
    .card, .chev { transition: none; }
    .card:hover { transform: none; }
  }
</style>
</head>
<body>
  <header>
    <h1 class="wordmark">Aura</h1>
    <p>Elige una app</p>
  </header>

  <main>
      ${links}
  </main>

  <footer>Funcionan sin internet · Se instalan desde tu navegador</footer>
</body>
</html>
`;
writeFileSync(path.join(OUT, 'index.html'), hub);

// 404 de la raíz del sitio: Pages lo sirve para CUALQUIER ruta inexistente.
// Truco spa-github-pages: en vez de tirar la sub-ruta, la codifica en la query
// string (?/pets) y el index.html de la app la decodifica con replaceState
// antes de montar React — así una recarga en /aura/home/pets no pierde la ruta.
const notFound = `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<script>
  (function () {
    var m = location.pathname.match(/^\\/aura\\/(home|music|weather)(\\/.*)?$/);
    if (!m) { location.replace('/aura/'); return; }
    var base = '/aura/' + m[1];
    var rest = (m[2] || '/').replace(/&/g, '~and~');
    var qs = location.search ? '&' + location.search.slice(1).replace(/&/g, '~and~') : '';
    location.replace(base + '/?' + rest + qs + location.hash);
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
