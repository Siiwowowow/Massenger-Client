"use client";

import { useEffect, useRef } from "react";

type RingtoneMode = "incoming" | "outgoing" | null;

interface UseCallRingtoneOptions {
  incoming: boolean;
  outgoing: boolean;
}

export function useCallRingtone({ incoming, outgoing }: UseCallRingtoneOptions): void {
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const mode: RingtoneMode = incoming ? "incoming" : outgoing ? "outgoing" : null;

    if (!mode || typeof window === "undefined") {
      return undefined;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      return undefined;
    }

    const context = audioContextRef.current ?? new AudioContextConstructor();
    audioContextRef.current = context;

    const playTone = () => {
      if (context.state === "suspended") {
        void context.resume().catch(() => undefined);
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const frequency = mode === "incoming" ? 740 : 520;
      const now = context.currentTime;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
    };

    playTone();
    intervalRef.current = setInterval(playTone, mode === "incoming" ? 900 : 1500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      void context.suspend().catch(() => undefined);
    };
  }, [incoming, outgoing]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      void audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = null;
    };
  }, []);
}
