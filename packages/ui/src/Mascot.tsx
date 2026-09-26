import type { MascotMood } from '@cutepad/core';
import { useApp } from '@cutepad/core';

export interface MascotProps {
  mood?: MascotMood;
  size?: number;
  className?: string;
  outfit?: string;
}

const OUTLINE = '#4a3a52';
const BODY = '#ffd3e5';
const BODY_DARK = '#ffc2da';
const BLUSH = '#ff9dbf';

function OpenEye({ cx, cy, r = 7 }: { cx: number; cy: number; r?: number }) {
  return (
    <g className="mascot-eye">
      <circle cx={cx} cy={cy} r={r} fill={OUTLINE} />
      <circle cx={cx + r * 0.34} cy={cy - r * 0.36} r={r * 0.32} fill="#fff" />
    </g>
  );
}

function HappyEye({ cx, cy }: { cx: number; cy: number }) {
  return <path d={`M ${cx - 8} ${cy + 2} q 8 -10 16 0`} stroke={OUTLINE} strokeWidth="4" fill="none" strokeLinecap="round" />;
}

function SleepEye({ cx, cy }: { cx: number; cy: number }) {
  return <path d={`M ${cx - 8} ${cy - 2} q 8 8 16 0`} stroke={OUTLINE} strokeWidth="4" fill="none" strokeLinecap="round" />;
}

function HeartEye({ cx, cy }: { cx: number; cy: number }) {
  return (
    <path
      d={`M ${cx} ${cy + 6} c -7 -6 -9 -9 -9 -13 a 4.5 4.5 0 0 1 9 -2 a 4.5 4.5 0 0 1 9 2 c 0 4 -2 7 -9 13 z`}
      fill="#ff5f8f"
      stroke={OUTLINE}
      strokeWidth="2"
    />
  );
}

function Sparkle({ x, y, s = 1, color = '#ffd76e', delay = 0 }: { x: number; y: number; s?: number; color?: string; delay?: number }) {
  return (
    <path
      className="mascot-sparkle"
      style={{ animationDelay: `${delay}s` }}
      d={`M ${x} ${y - 7 * s} L ${x + 2 * s} ${y - 2 * s} L ${x + 7 * s} ${y} L ${x + 2 * s} ${y + 2 * s} L ${x} ${y + 7 * s} L ${x - 2 * s} ${y + 2 * s} L ${x - 7 * s} ${y} L ${x - 2 * s} ${y - 2 * s} Z`}
      fill={color}
    />
  );
}

function Mouth({ mood }: { mood: MascotMood }) {
  if (mood === 'cheer' || mood === 'love') {
    return (
      <g>
        <path d="M 48 78 q 12 16 24 0 z" fill={OUTLINE} />
        <path d="M 54 84 q 6 8 12 0 z" fill="#ff8fb3" />
      </g>
    );
  }
  if (mood === 'sad') {
    return <path d="M 51 84 q 9 -8 18 0" stroke={OUTLINE} strokeWidth="4" fill="none" strokeLinecap="round" />;
  }
  if (mood === 'think') {
    return <ellipse cx="60" cy="81" rx="4.5" ry="5.5" fill={OUTLINE} />;
  }
  if (mood === 'sleep') {
    return <ellipse cx="60" cy="81" rx="5" ry="6" fill={OUTLINE} opacity="0.85" />;
  }
  if (mood === 'study') {
    return <path d="M 53 80 q 7 6 14 0" stroke={OUTLINE} strokeWidth="3.6" fill="none" strokeLinecap="round" />;
  }
  return <path d="M 46 78 q 7 9 14 0 q 7 9 14 0" stroke={OUTLINE} strokeWidth="3.6" fill="none" strokeLinecap="round" />;
}

function Eyes({ mood }: { mood: MascotMood }) {
  if (mood === 'cheer' || mood === 'love') {
    return (
      <>
        <HappyEye cx={44} cy={68} />
        <HappyEye cx={76} cy={68} />
      </>
    );
  }
  if (mood === 'sleep') {
    return (
      <>
        <SleepEye cx={44} cy={68} />
        <SleepEye cx={76} cy={68} />
      </>
    );
  }
  if (mood === 'study') {
    return (
      <>
        <OpenEye cx={44} cy={68} r={6} />
        <OpenEye cx={76} cy={68} r={6} />
        <path d="M 34 56 l 14 4 M 86 56 l -14 4" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
      </>
    );
  }
  if (mood === 'sad') {
    return (
      <>
        <OpenEye cx={44} cy={70} r={6.5} />
        <OpenEye cx={76} cy={70} r={6.5} />
        <path d="M 35 58 q 9 5 17 2 M 85 58 q -9 5 -17 2" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      </>
    );
  }
  if (mood === 'think') {
    return (
      <>
        <OpenEye cx={44} cy={66} r={7} />
        <circle cx="78" cy="70" r="7" fill="#fff" stroke={OUTLINE} strokeWidth="3" />
        <circle cx="79.5" cy="67.5" r="2.4" fill={OUTLINE} />
      </>
    );
  }
  return (
    <>
      <OpenEye cx={44} cy={68} />
      <OpenEye cx={76} cy={68} />
    </>
  );
}

function Outfit({ id }: { id: string }) {
  switch (id) {
    case 'bow':
      return (
        <g>
          <path d="M84 32 L70 24 L70 40 Z" fill="#ff7fae" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M84 32 L98 24 L98 40 Z" fill="#ff7fae" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="84" cy="32" r="4.5" fill="#ff5f8f" stroke={OUTLINE} strokeWidth="2.5" />
        </g>
      );
    case 'glasses':
      return (
        <g>
          <path d="M33 64 L22 58 M87 64 L98 58" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round" />
          <circle cx="44" cy="68" r="11" fill="rgba(255,255,255,0.35)" stroke={OUTLINE} strokeWidth="3" />
          <circle cx="76" cy="68" r="11" fill="rgba(255,255,255,0.35)" stroke={OUTLINE} strokeWidth="3" />
          <path d="M55 68 h10" stroke={OUTLINE} strokeWidth="3" />
        </g>
      );
    case 'beret':
      return (
        <g>
          <ellipse cx="58" cy="28" rx="28" ry="12" fill="#ff9ec4" stroke={OUTLINE} strokeWidth="3" transform="rotate(-8 58 28)" />
          <circle cx="50" cy="17" r="4" fill="#ff9ec4" stroke={OUTLINE} strokeWidth="2.5" />
        </g>
      );
    case 'scarf':
      return (
        <g>
          <rect x="34" y="97" width="52" height="13" rx="6.5" fill="#ff9ec4" stroke={OUTLINE} strokeWidth="3" />
          <path d="M72 108 l10 18 l-14 -5 z" fill="#ff9ec4" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    case 'crown':
      return (
        <g>
          <path d="M45 30 L45 13 L52 21 L60 9 L68 21 L75 13 L75 30 Z" fill="#ffd76e" stroke={OUTLINE} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="60" cy="24" r="3" fill="#ff7fae" />
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d="M20 58 C 28 18, 92 18, 100 58" stroke={OUTLINE} strokeWidth="10" fill="none" strokeLinecap="round" />
          <path d="M20 58 C 28 18, 92 18, 100 58" stroke="#c9b6ff" strokeWidth="6" fill="none" strokeLinecap="round" />
          <rect x="11" y="54" width="18" height="26" rx="9" fill="#c9b6ff" stroke={OUTLINE} strokeWidth="3" />
          <rect x="91" y="54" width="18" height="26" rx="9" fill="#c9b6ff" stroke={OUTLINE} strokeWidth="3" />
        </g>
      );
    case 'halo':
      return (
        <g>
          <ellipse cx="60" cy="7" rx="18" ry="5" fill="none" stroke="#ffd76e" strokeWidth="4.5" />
          <ellipse cx="60" cy="7" rx="18" ry="5" fill="none" stroke={OUTLINE} strokeWidth="1.2" opacity="0.5" />
        </g>
      );
    default:
      return null;
  }
}

export function Mascot({ mood = 'idle', size = 110, className = '', outfit }: MascotProps) {
  const storeOutfit = useApp((s) => s.settings.mascotOutfit);
  const fit = outfit ?? storeOutfit;
  const bodyAnim =
    mood === 'cheer'
      ? 'mascot-cheer'
      : mood === 'sleep'
        ? 'mascot-sleep'
        : mood === 'study'
          ? 'mascot-study'
          : 'mascot-idle';

  return (
    <span className={`mascot-wrap ${className}`} style={{ width: size, height: (size * 134) / 120 }}>
      <style>{`
        .mascot-wrap svg { width: 100%; height: 100%; overflow: visible; }
        .mascot-idle { animation: mascot-breathe 3.2s ease-in-out infinite; transform-origin: 60px 120px; }
        .mascot-cheer { animation: mascot-jump 0.55s cubic-bezier(.34,1.56,.64,1) infinite alternate; transform-origin: 60px 120px; }
        .mascot-sleep { animation: mascot-sway 4.5s ease-in-out infinite; transform-origin: 60px 120px; }
        .mascot-study { animation: mascot-breathe 4.5s ease-in-out infinite; transform-origin: 60px 120px; }
        .mascot-eye { animation: mascot-blink 4.6s infinite; transform-origin: center; }
        .mascot-sparkle { animation: mascot-twinkle 1.1s ease-in-out infinite alternate; transform-box: fill-box; transform-origin: center; }
        @keyframes mascot-breathe { 0%,100% { transform: scaleY(1) translateY(0);} 50% { transform: scaleY(1.025) translateY(-2px);} }
        @keyframes mascot-jump { from { transform: translateY(0) rotate(-3deg);} to { transform: translateY(-9px) rotate(3deg);} }
        @keyframes mascot-sway { 0%,100% { transform: rotate(-2.5deg);} 50% { transform: rotate(2.5deg);} }
        @keyframes mascot-blink { 0%, 92%, 100% { transform: scaleY(1);} 95% { transform: scaleY(0.08);} }
        @keyframes mascot-twinkle { from { opacity: .35; transform: scale(.7) rotate(0deg);} to { opacity: 1; transform: scale(1.15) rotate(35deg);} }
      `}</style>
      <svg viewBox="0 0 120 134" role="img" aria-label={`Study buddy mascot, feeling ${mood}`}>
        <g className={bodyAnim}>
          {(mood === 'cheer' || mood === 'love') && (
            <>
              <ellipse cx="16" cy="74" rx="9" ry="13" fill={BODY} stroke={OUTLINE} strokeWidth="3" transform="rotate(-38 16 74)" />
              <ellipse cx="104" cy="74" rx="9" ry="13" fill={BODY} stroke={OUTLINE} strokeWidth="3" transform="rotate(38 104 74)" />
            </>
          )}
          <path d="M30 44 L33 14 L57 32 Z" fill={BODY} stroke={OUTLINE} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M90 44 L87 14 L63 32 Z" fill={BODY} stroke={OUTLINE} strokeWidth="3.5" strokeLinejoin="round" />
          <path d="M36 40 L38 24 L50 33 Z" fill={BLUSH} opacity="0.75" />
          <path d="M84 40 L82 24 L70 33 Z" fill={BLUSH} opacity="0.75" />
          <path
            d="M60 24 C 30 24 16 46 16 74 C 16 104 34 124 60 124 C 86 124 104 104 104 74 C 104 46 90 24 60 24 Z"
            fill={BODY}
            stroke={OUTLINE}
            strokeWidth="3.5"
          />
          <path d="M32 106 q 28 14 56 0 q -6 16 -28 16 q -22 0 -28 -16 z" fill={BODY_DARK} opacity="0.7" />
          <ellipse cx="48" cy="122" rx="11" ry="7" fill={BODY} stroke={OUTLINE} strokeWidth="3" />
          <ellipse cx="72" cy="122" rx="11" ry="7" fill={BODY} stroke={OUTLINE} strokeWidth="3" />
          <Eyes mood={mood} />
          <Mouth mood={mood} />
          <circle cx="32" cy="82" r="8" fill={BLUSH} opacity="0.7" />
          <circle cx="88" cy="82" r="8" fill={BLUSH} opacity="0.7" />
          {mood === 'study' && (
            <g>
              <rect x="36" y="98" width="48" height="20" rx="5" fill="#cfe5ff" stroke={OUTLINE} strokeWidth="3" />
              <path d="M60 98 v20" stroke={OUTLINE} strokeWidth="2.5" />
              <path d="M43 105 h11 M43 110 h11 M66 105 h11 M66 110 h11" stroke="#8fb4e0" strokeWidth="2" strokeLinecap="round" />
            </g>
          )}
          {mood === 'sad' && <path d="M92 60 q 4 8 0 11 q -4 -3 0 -11 z" fill="#9cd4ff" stroke={OUTLINE} strokeWidth="2" />}
          {(mood === 'cheer' || mood === 'love') && (
            <>
              <Sparkle x={12} y={26} color="#ffd76e" />
              <Sparkle x={108} y={34} s={0.8} color="#b8a6ff" delay={0.35} />
              <Sparkle x={96} y={8} s={0.65} color="#8fe3c8" delay={0.7} />
            </>
          )}
          {mood === 'think' && (
            <>
              <circle cx="102" cy="34" r="4" fill={BODY} stroke={OUTLINE} strokeWidth="2.5" />
              <circle cx="110" cy="22" r="6" fill={BODY} stroke={OUTLINE} strokeWidth="2.5" />
            </>
          )}
          <Outfit id={fit} />
        </g>
        {mood === 'sleep' && <text x="98" y="30" fontSize="17" fontWeight="800" fill="#b8a6ff">z</text>}
      </svg>
    </span>
  );
}
