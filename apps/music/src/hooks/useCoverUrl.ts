import { useEffect, useState } from 'react';

import { generatedCoverUri, getCoverUrl } from '@/services/artwork/artwork';

/**
 * Resuelve la portada de forma asíncrona (vive en IndexedDB) y mientras tanto
 * devuelve una generada a partir del nombre: así la cuadrícula nunca parpadea
 * con huecos vacíos.
 */
export function useCoverUrl(coverId: string | undefined, fallbackName: string) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (coverId) {
      void getCoverUrl(coverId).then((u) => {
        if (!cancelled) setUrl(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [coverId]);

  return url ?? generatedCoverUri(fallbackName);
}
