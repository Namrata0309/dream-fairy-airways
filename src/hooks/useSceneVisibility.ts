import { useEffect, useRef, useState } from 'react';
import { isWebGLAvailable } from '../three/sceneUtils';

export function useSceneVisibility() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const isVisibleRef = useRef(true);
  const [webglSupported, setWebglSupported] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setWebglSupported(isWebGLAvailable());

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);

    const el = containerRef.current;
    let observer: IntersectionObserver | null = null;
    if (el && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            isVisibleRef.current = entry.isIntersecting;
          }
        },
        { rootMargin: '220px 0px' },
      );
      observer.observe(el);
    }

    return () => {
      mq.removeEventListener('change', onChange);
      observer?.disconnect();
    };
  }, []);

  return { containerRef, isVisibleRef, webglSupported, reducedMotion };
}
