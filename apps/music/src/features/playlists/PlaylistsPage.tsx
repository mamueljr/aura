import { Heart, ListMusic, Plus, Sparkles, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@aura/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@aura/ui/components/dialog';
import { Input } from '@aura/ui/components/input';
import type { Playlist, SmartPlaylistKind } from '@/core/types';
import { useFavoriteTracks, usePlaylists } from '@/hooks/useLibrary';
import { generatedCoverUri } from '@/services/artwork/artwork';
import {
  createPlaylist,
  createSmartPlaylist,
  importPlaylistFile,
  type PlaylistImportReport,
} from '@/services/playlists/playlists';

const SMART_KINDS: SmartPlaylistKind[] = ['recentlyAdded', 'mostPlayed', 'neverPlayed'];

function playlistDisplayName(playlist: Playlist, t: (key: string) => string): string {
  return playlist.smart ? t(`playlists.smart_${playlist.smart.kind}`) : playlist.name;
}

export default function PlaylistsPage() {
  const { t } = useTranslation();
  const playlists = usePlaylists();
  const favorites = useFavoriteTracks();
  const [createOpen, setCreateOpen] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [importResult, setImportResult] = useState<PlaylistImportReport | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const create = async () => {
    if (!name.trim()) return;
    await createPlaylist(name, description);
    setName('');
    setDescription('');
    setCreateOpen(false);
  };

  const createSmart = async (kind: SmartPlaylistKind) => {
    await createSmartPlaylist({ kind });
    setSmartOpen(false);
  };

  const onImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImportResult(await importPlaylistFile(file));
    } catch {
      setImportResult(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={t('playlists.title')}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => fileInput.current?.click()}>
              <Upload /> {t('playlists.import')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSmartOpen(true)}>
              <Sparkles /> {t('playlists.newSmartPlaylist')}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus /> {t('playlists.newPlaylist')}
            </Button>
          </div>
        }
      />
      <input
        ref={fileInput}
        type="file"
        accept=".m3u,.m3u8,.json"
        className="hidden"
        tabIndex={-1}
        onChange={(e) => {
          void onImportFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-8">
        {/* Pinned favorites entry */}
        <Link
          to="/favorites"
          className="mb-4 flex items-center gap-4 rounded-2xl border bg-card/60 p-3 transition-colors hover:bg-accent/70"
        >
          <div className="flex size-14 items-center justify-center rounded-xl aura-gradient text-white shadow-md">
            <Heart className="size-6 fill-current" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('favorites.title')}</p>
            <p className="text-xs text-muted-foreground">
              {t('common.songs', { count: favorites?.length ?? 0 })}
            </p>
          </div>
        </Link>

        {playlists && playlists.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {playlists.map((playlist) => {
              const displayName = playlistDisplayName(playlist, t);
              return (
                <Link
                  key={playlist.id}
                  to={`/playlists/${playlist.id}`}
                  className="flex items-center gap-4 rounded-2xl border bg-card/60 p-3 transition-colors hover:bg-accent/70"
                >
                  <img
                    src={generatedCoverUri(playlist.name)}
                    alt=""
                    className="size-14 rounded-xl object-cover shadow-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {playlist.smart
                        ? t('playlists.smartBadge')
                        : t('common.songs', { count: playlist.trackIds.length })}
                      {!playlist.smart && playlist.description
                        ? ` · ${playlist.description}`
                        : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : playlists ? (
          <EmptyState
            icon={<ListMusic />}
            title={t('playlists.emptyTitle')}
            body={t('playlists.emptyBody')}
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus /> {t('playlists.newPlaylist')}
              </Button>
            }
          />
        ) : null}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('playlists.createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('common.name')}
              aria-label={t('common.name')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void create();
              }}
            />
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`${t('common.description')} (${t('common.optional')})`}
              aria-label={t('common.description')}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!name.trim()} onClick={() => void create()}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={smartOpen} onOpenChange={setSmartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('playlists.smartPlaylistTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {SMART_KINDS.map((kind) => (
              <Button
                key={kind}
                variant="outline"
                className="w-full justify-start"
                onClick={() => void createSmart(kind)}
              >
                <Sparkles className="text-aura-1" /> {t(`playlists.smart_${kind}`)}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!importResult} onOpenChange={(open) => !open && setImportResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('playlists.import')}</DialogTitle>
          </DialogHeader>
          {importResult ? (
            <p className="text-sm text-muted-foreground">
              {t('playlists.importResult', {
                name: importResult.name,
                matched: importResult.matched,
                missed: importResult.missed,
              })}
            </p>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setImportResult(null)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
