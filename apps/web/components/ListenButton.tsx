'use client';

import { useEffect, useState } from 'react';

/**
 * ADR 0002 — audio is an accessibility layer, not a gimmick. Every critical
 * instruction can be listened to. When speech synthesis is unavailable the button
 * hides itself rather than pretending to work.
 */
export function ListenButton({
  text,
  label,
  lang = 'bn-BD',
}: {
  text: string;
  label: string;
  lang?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  if (!supported) return null;

  const speak = () => {
    const synth = window.speechSynthesis;
    synth.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(utterance);
  };

  return (
    <button type="button" className="btn btn-secondary no-print" onClick={speak} aria-live="polite">
      <span aria-hidden="true">{speaking ? '⏸' : '🔊'}</span>
      <span>{label}</span>
    </button>
  );
}
