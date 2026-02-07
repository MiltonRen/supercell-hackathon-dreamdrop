import { useEffect, useRef } from 'react';

interface BgmProps {
  src: string;
  volume?: number;
  active?: boolean;
}

export function Bgm({ src, volume = 0.4, active = true }: BgmProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!active) return;

    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = volume;
    audio.preload = 'auto';
    audioRef.current = audio;

    const tryPlay = () => {
      audio.play().catch(() => {
        // Autoplay may be blocked; rely on user interaction.
      });
    };

    const resumeOnInteraction = () => {
      if (!audio.paused) return;
      audio.play().catch(() => {});
    };

    tryPlay();
    window.addEventListener('pointerdown', resumeOnInteraction, { once: true });

    return () => {
      window.removeEventListener('pointerdown', resumeOnInteraction);
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [src, volume, active]);

  return null;
}
