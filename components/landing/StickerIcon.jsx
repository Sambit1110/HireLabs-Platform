/**
 * Small tilted sticker icons for the "How it works" cards.
 * Simple original shapes: document, linked circles, speech bubble, balance.
 */
const ICONS = {
  parse: {
    fill: 'var(--champagne)',
    paths: (
      <>
        <path d="M14 9h12l6 6v20H14z" />
        <path d="M26 9v6h6M18 21h10M18 26h10M18 31h6" />
      </>
    ),
  },
  match: {
    fill: 'var(--cream)',
    paths: (
      <>
        <circle cx="17" cy="22" r="7" />
        <circle cx="27" cy="22" r="7" />
      </>
    ),
  },
  explain: {
    fill: 'var(--champagne)',
    paths: (
      <>
        <path d="M10 13h24v15H21l-6 5v-5h-5z" />
        <path d="M15 19h14M15 23h9" />
      </>
    ),
  },
  fair: {
    fill: 'var(--cream)',
    paths: (
      <>
        <path d="M22 10v24M14 34h16M12 15h20" />
        <path d="M12 15l-4 9h8zM32 15l-4 9h8z" />
      </>
    ),
  },
};

export function StickerIcon({ kind }) {
  const icon = ICONS[kind] || ICONS.parse;
  return (
    <span className="lp-sticker" style={{ background: icon.fill }} aria-hidden="true">
      <svg viewBox="0 0 44 44" fill="none" stroke="#0F0F0F" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
        {icon.paths}
      </svg>
    </span>
  );
}
