import { AnimatePresence, motion } from 'framer-motion';
import { Heart, ListMusic, SkipBack, SkipForward } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Artwork } from '@/components/Artwork';
import { Button } from '@aura/ui/components/button';
import { cn } from '@/lib/utils';
import { hapticTap, hapticTrackChange } from '@/lib/haptics';
import { toggleFavorite } from '@/services/library/actions';
import { player } from '@/services/audio/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';

import { PlayPauseButton, TransportControls } from './PlayerControls';
import { SeekBar } from './SeekBar';
import { VolumeControl } from './VolumeControl';

/** Umbral de arrastre horizontal para saltar de pista (px). */
const SWIPE_THRESHOLD = 64;

export function MiniPlayer() {
  const { t } = useTranslation();
  const track = usePlayerStore((s) => s.currentTrack);
  const position = usePlayerStore((s) => s.position);
  const duration = usePlayerStore((s) => s.duration);
  const setNowPlayingOpen = useUiStore((s) => s.setNowPlayingOpen);
  const setQueueOpen = useUiStore((s) => s.setQueueOpen);
  const queueOpen = useUiStore((s) => s.queueOpen);
  const dragged = useRef(false);

  return (
    <AnimatePresence>
      {track ? (
        <motion.div
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="glass relative z-30 border-t"
        >
          {/* Thin progress line on mobile (full seek bar lives on desktop row) */}
          <div
            className="absolute inset-x-0 top-0 h-0.5 bg-muted-foreground/15 md:hidden"
            role="progressbar"
            aria-label={t('player.seek')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={duration ? Math.round((position / duration) * 100) : 0}
          >
            <div
              className="h-full aura-gradient transition-[width] duration-300"
              style={{ width: duration ? `${(position / duration) * 100}%` : '0%' }}
            />
          </div>

          {/*
            Solo la carátula y el título abren "Reproduciendo ahora". Antes el
            botón envolvía la fila entera y los controles necesitaban frenar la
            propagación del click; con el teclado eso no funcionaba y pulsar
            Enter sobre "cola" abría además el overlay.
          */}
          <div className="flex items-center gap-3 px-3 py-2.5 md:px-4 md:py-2.5">
            <motion.button
              type="button"
              aria-label={t('player.nowPlaying')}
              onClick={() => {
                if (dragged.current) {
                  dragged.current = false;
                  return;
                }
                setNowPlayingOpen(true);
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.3}
              dragSnapToOrigin
              onDragStart={() => {
                dragged.current = false;
              }}
              onDragEnd={(_, info) => {
                if (info.offset.x <= -SWIPE_THRESHOLD) {
                  dragged.current = true;
                  hapticTrackChange();
                  void player.next();
                } else if (info.offset.x >= SWIPE_THRESHOLD) {
                  dragged.current = true;
                  hapticTrackChange();
                  void player.previous();
                }
              }}
              className="flex min-w-0 flex-1 cursor-grab items-center gap-3 text-left active:cursor-grabbing md:flex-none md:cursor-pointer"
            >
              <motion.div layoutId="now-playing-art" className="shrink-0">
                <Artwork
                  coverId={track.coverId}
                  name={track.album || track.title}
                  className="size-11 md:size-12 shadow-md"
                />
              </motion.div>

              <div className="min-w-0 flex-1 md:w-56 md:flex-none">
                <p className="truncate text-sm font-semibold">{track.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {track.artist || t('common.unknownArtist')}
                </p>
              </div>
            </motion.button>

            <button
              type="button"
              aria-label={
                track.favorite ? t('player.removeFromFavorites') : t('player.addToFavorites')
              }
              aria-pressed={!!track.favorite}
              onClick={() => {
                hapticTap();
                void toggleFavorite(track.id);
              }}
              className={cn(
                'hidden rounded-full p-2 text-muted-foreground transition-colors hover:text-foreground sm:block',
                track.favorite && 'text-aura-3',
              )}
            >
              <Heart className={cn('size-4', track.favorite && 'fill-current')} />
            </button>

            {/* Desktop: full transport + seek in the middle */}
            <div className="hidden min-w-0 flex-1 flex-col items-center gap-1 md:flex">
              <TransportControls />
              <div className="w-full max-w-xl">
                <SeekBar />
              </div>
            </div>

            <div className="hidden items-center gap-1 md:flex">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('player.queue')}
                aria-pressed={queueOpen}
                onClick={() => setQueueOpen(!queueOpen)}
                className={cn(queueOpen && 'text-aura-1')}
              >
                <ListMusic />
              </Button>
              <VolumeControl />
            </div>

            {/* Mobile: skip + big play/pause */}
            <div className="flex items-center gap-1.5 md:hidden">
              <Button
                variant="ghost"
                size="icon-xl"
                aria-label={t('player.previous')}
                onClick={() => {
                  hapticTrackChange();
                  void player.previous();
                }}
              >
                <SkipBack className="size-6 fill-current" />
              </Button>
              <PlayPauseButton size="icon-2xl" className="[&_svg]:size-8" />
              <Button
                variant="ghost"
                size="icon-xl"
                aria-label={t('player.next')}
                onClick={() => {
                  hapticTrackChange();
                  void player.next();
                }}
              >
                <SkipForward className="size-6 fill-current" />
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
