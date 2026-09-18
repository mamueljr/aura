# Project plan — milestones, issues & conventions

Working agreement for the repository: Conventional Commits, milestone-scoped issues, PRs green on `lint` + `build`.

## Commit convention

[Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary`

Types used here: `feat`, `fix`, `perf`, `refactor`, `style`, `docs`, `test`, `build`, `ci`, `chore`.
Scopes mirror the folders: `player`, `library`, `playlists`, `search`, `settings`, `pwa`, `db`, `audio`, `i18n`, `ui`.

Examples:

```
feat(audio): add 10-band equalizer with presets
fix(library): keep favorites across incremental rescans
perf(library): virtualize songs list for 20k-track libraries
docs: add architecture diagrams
```

## Milestones

| Milestone | Goal | Definition of done |
| --------- | ---- | ------------------ |
| **M1 — Foundation** ✅ | Scaffold, design system, i18n, routing, layout | App shell renders on mobile & desktop, themes switch |
| **M2 — Library** ✅ | Folder scan → IndexedDB, all library views | 20k tracks scan without UI freeze; rescan detects changes |
| **M3 — Player** ✅ | Full playback engine + Now Playing | EQ, crossfade, visualizers, Media Session all functional |
| **M4 — Collections** ✅ | Playlists, favorites, search | Drag-and-drop reorder, export, instant search |
| **M5 — PWA & deploy** ✅ | Offline, installable, monorepo deploy to Pages | Deep links load with the server off; Lighthouse installable |
| **M6 — Polish** ✅ | v0.2 roadmap items | Synced lyrics view, online covers, OPFS import, stats |
| **M6.5 — Polish II** ✅ | v0.2.x roadmap items | Playlist import, smart playlists, loudness scan, haptics, remove app copy |
| **M7 — Sync** ✅ | v0.3 roadmap items | Aura Sync (Google Drive) behind `@aura/sync` — playlists, favorites, history + library in the cloud |

## Suggested issues (ready to open)

**M6.5 — Polish II** ✅ shipped

1. ~~`feat(player): full-screen synced lyrics view`~~ ✅ shipped in v0.2
2. ~~`feat(artwork): online cover fallback`~~ ✅ shipped in v0.2 (iTunes + CAA)
3. ~~`feat(playlists): import M3U/JSON`~~ ✅ shipped — parse the formats produced by the exporter; match tracks by path, then by title+artist+duration.
4. ~~`feat(library): smart playlists`~~ ✅ shipped — persisted query definitions (recently added / most played / never played).
5. ~~`perf(audio): per-track loudness pre-scan`~~ ✅ shipped — gain computed on first play with `decodeAudioData`, cached in `tracks`.
6. ~~`test: scanner unit tests with fixture MP3s`~~ ✅ shipped — `scanner.test.ts` + `importer.test.ts` con `fake-indexeddb` (prune de portadas, removeFolder, import).
7. ~~`test: Playwright smoke`~~ ✅ shipped — `e2e/smoke.spec.ts` recorre las pantallas; `pnpm --filter aura-music test:e2e`.
8. `a11y: audit focus order and dialog traps` — axe pass on every screen.

**M7 — Sync** ✅ shipped as **Aura Sync** (Google Drive + E2E), not Supabase

9. ~~`feat(sync): Supabase SyncProvider`~~ ✅ shipped — Google Drive transport via `@aura/sync` (playlists, favorites, settings, history + audio library).
10. ~~`feat(sync): conflict resolution + tombstones`~~ ✅ shipped — content-derived signals + tombstones.
11. `feat(share): public read-only playlist links` — signed URL rendering a lightweight viewer route.

## Release checklist

- [ ] `pnpm --filter aura-music lint && pnpm --filter aura-music build` clean
- [ ] Manual smoke on Chrome desktop + Android (install, offline reload, playback)
- [ ] Bump `APP_VERSION` in `src/core/constants.ts` + `package.json`
- [ ] Tag `vX.Y.Z`, GitHub release with highlights
