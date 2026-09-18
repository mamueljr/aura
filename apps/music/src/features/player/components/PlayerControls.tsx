import { Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@aura/ui/components/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { hapticTrackChange } from '@/lib/haptics';
import { player } from '@/services/audio/AudioEngine';
import { usePlayerStore } from '@/stores/playerStore';

export function PlayPauseButton({
  size = 'icon',
  className = '',
}: {
  size?: 'icon' | 'icon-sm' | 'icon-lg' | 'icon-xl' | 'icon-2xl';
  className?: string;
}) {
  const { t } = useTranslation();
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const iconSize = size === 'icon-2xl' ? 'size-8' : size === 'icon-xl' ? 'size-6' : undefined;

  return (
    <Button
      size={size}
      aria-label={isPlaying ? t('player.pause') : t('player.play')}
      onClick={(e) => {
        e.stopPropagation();
        void player.togglePlay();
      }}
      className={className}
    >
      {isPlaying ? (
        <Pause className={cn('fill-current', iconSize)} />
      ) : (
        <Play className={cn('ml-0.5 fill-current', iconSize)} />
      )}
    </Button>
  );
}

export function TransportControls({ large = false }: { large?: boolean }) {
  const { t } = useTranslation();
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const side = large ? 'icon-xl' : 'icon-sm';
  const sideIcon = large ? 'size-6' : undefined;

  return (
    <div className={cn('flex items-center', large ? 'gap-3 md:gap-5' : 'gap-1')}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={side}
            aria-label={t('player.shuffle')}
            aria-pressed={shuffle}
            onClick={(e) => {
              e.stopPropagation();
              player.toggleShuffle();
            }}
            className={cn(shuffle && 'text-aura-1')}
          >
            <Shuffle className={sideIcon} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('player.shuffle')}</TooltipContent>
      </Tooltip>

      <Button
        variant="ghost"
        size={side}
        aria-label={t('player.previous')}
        onClick={(e) => {
          e.stopPropagation();
          hapticTrackChange();
          void player.previous();
        }}
      >
        <SkipBack className={cn('fill-current', sideIcon)} />
      </Button>

      <PlayPauseButton size={large ? 'icon-2xl' : 'icon'} />

      <Button
        variant="ghost"
        size={side}
        aria-label={t('player.next')}
        onClick={(e) => {
          e.stopPropagation();
          hapticTrackChange();
          void player.next();
        }}
      >
        <SkipForward className={cn('fill-current', sideIcon)} />
      </Button>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={side}
            aria-label={repeat === 'one' ? t('player.repeatOne') : t('player.repeat')}
            aria-pressed={repeat !== 'off'}
            onClick={(e) => {
              e.stopPropagation();
              player.cycleRepeat();
            }}
            className={cn(repeat !== 'off' && 'text-aura-1')}
          >
            {repeat === 'one' ? <Repeat1 className={sideIcon} /> : <Repeat className={sideIcon} />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t('player.repeat')}</TooltipContent>
      </Tooltip>
    </div>
  );
}
