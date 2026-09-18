# Roadmap

The MVP (v0.1) ships a complete offline experience. Everything below builds on the extension points already in the codebase — none of it requires re-architecting.

## v0.2 — Polish & depth (shipped ✅)

- [x] Synced-lyrics karaoke view inside Now Playing (active line, tap-to-seek)
- [x] Online cover art fallback (iTunes Search → Cover Art Archive) with negative cache
- [x] "Import into app" (OPFS): permission-free playback, per-folder, with progress
- [x] Listening stats screen (plays, time, top songs/artists/albums/genres)

## v0.2.x — Polish (shipped ✅)

- [x] Playlist import (M3U / JSON) — the export formats are already defined
- [x] Smart playlists (recently added, most played, never played) as saved queries
- [x] ReplayGain-style per-track loudness scan for true normalization
- [x] Haptics + gesture polish on mobile (swipe mini-player to change track)
- [x] "Remove app copy" control for imported folders (free OPFS space without removing the folder)
- [ ] Native Android build via Capacitor (grant storage permission once at OS level)

## v0.3 — Cloud sync ✅ shipped (Aura Sync, not Supabase)

Cloud sync shipped as **Aura Sync**, shared across the ecosystem via `@aura/sync`
(Google Drive `appDataFolder` transport + opt-in E2E encryption), not the originally
planned Supabase backend.

- [x] Sync playlists, favorites, settings, play history (Fase A)
- [x] Library in the cloud: resumable audio upload, on-demand download to OPFS, snapshot v2 (Fase B)
- [x] Conflict strategy: content-derived signals + tombstones
- [x] Quota check before upload, orphan-file cleanup, cover art sync
- [x] Configurable upload concurrency (slow / medium / fast)
- [ ] Share a playlist as a public read-only link
- [ ] Alternative provider (the `SyncProvider` contract is preserved)

## v0.4 — Beyond music

- [ ] Podcasts (RSS ingestion, episode progress tracking)
- [ ] Audiobooks (chapter navigation, resume points, speed memory per book)
- [ ] Personal streaming: point the app at your own server (Subsonic/Navidrome-style API adapter as a second "library source")
- [ ] Cross-device continuity ("continue on desktop") via the sync backend

## Continuous

- Lighthouse ≥ 95 on all categories
- [x] Unit tests for scanner/date-model (Vitest) and E2E smoke (Playwright)
- Bundle budget: main chunk < 200 kB gzip
