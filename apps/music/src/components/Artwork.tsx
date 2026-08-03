import { useCoverUrl } from '@/hooks/useCoverUrl';
import { cn } from '@/lib/utils';

export function Artwork({
  coverId,
  name,
  className,
  rounded = 'rounded-lg',
}: {
  coverId?: string;
  name: string;
  className?: string;
  rounded?: string;
}) {
  const url = useCoverUrl(coverId, name);

  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      className={cn('aspect-square select-none bg-muted object-cover', rounded, className)}
    />
  );
}
