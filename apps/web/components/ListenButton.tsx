'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@probash/web-ui';

/**
 * ADR 0002 — audio is an accessibility layer, not a gimmick. Every critical
 * instruction can be listened to. When speech synthesis is unavailable the button
 * hides itself rather than pretending to work.
 */
export function ListenButton({
  text,
  label,
  stopLabel,
  lang = 'bn-BD',
  iconOnly = false,
}: {
  text: string;
  label: string;
  stopLabel?: string;
  lang?: string;
  iconOnly?: boolean;
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

  const accessibleLabel = speaking ? (stopLabel ?? label) : label;

  return (
    <button
      type="button"
      className={`btn btn-secondary listen-button${iconOnly ? ' listen-button--icon' : ''} no-print`}
      onClick={speak}
      aria-label={iconOnly ? accessibleLabel : undefined}
      aria-pressed={speaking}
      title={iconOnly ? accessibleLabel : undefined}
    >
      <span className="listen-button__glyph" aria-hidden="true">
        {speaking ? (
          <svg
            className="pui-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            focusable="false"
          >
            <path d="M8 5v14M16 5v14" />
          </svg>
        ) : (
          <Icon name="listen" size={20} />
        )}
      </span>
      {iconOnly ? null : <span>{accessibleLabel}</span>}
    </button>
  );
}
