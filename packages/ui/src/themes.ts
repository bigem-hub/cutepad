import type { ThemeId } from '@cutepad/core';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  emoji: string;
  desc: string;
  swatch: string[];
  dark?: boolean;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'pastel-dream',
    name: 'Pastel Dream',
    emoji: '🌸',
    desc: 'Soft pink · lavender · mint · baby blue',
    swatch: ['#ffd6e8', '#e3d1ff', '#cdeee4', '#cfe5ff'],
  },
  {
    id: 'hello-berry',
    name: 'Hello Berry',
    emoji: '🍓',
    desc: 'Strawberry soda & ribbon pinks',
    swatch: ['#ff9ec4', '#ffc2d8', '#ffe3ef', '#fff0f6'],
  },
  {
    id: 'pastel-goth',
    name: 'Pastel Goth',
    emoji: '🦇',
    desc: 'Lilac, ash & moonlit black',
    swatch: ['#c8b6ff', '#9d8cff', '#2b2340', '#171227'],
  },
  {
    id: 'cottagecore',
    name: 'Cottagecore',
    emoji: '🌿',
    desc: 'Sage, cream & honey sunlight',
    swatch: ['#b7d3a8', '#f6efdc', '#e8cfa1', '#8fb08a'],
  },
  {
    id: 'space-kawaii',
    name: 'Space Kawaii',
    emoji: '🪐',
    desc: 'Nebula purples & starry blues',
    swatch: ['#8ec5ff', '#b8a6ff', '#ffd1e3', '#2a2660'],
  },
  {
    id: 'kawaii-night',
    name: 'Kawaii Night',
    emoji: '🌙',
    desc: 'Dark mode, sleepy pastels',
    swatch: ['#ffb7d5', '#b8a6ff', '#1b1730', '#120e22'],
    dark: true,
  },
];

export function themeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export interface PatternMeta {
  id: string;
  name: string;
  emoji: string;
  css: string;
}

const svgUrl = (svg: string): string =>
  `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;

export const PATTERNS: PatternMeta[] = [
  {
    id: 'dots',
    name: 'Polka Dots',
    emoji: '⚪',
    css: `${svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><circle cx='12' cy='12' r='4' fill='%23ffb7d5' fill-opacity='0.55'/><circle cx='36' cy='36' r='4' fill='%23c8b6ff' fill-opacity='0.5'/></svg>`,
    )} repeat`,
  },
  {
    id: 'hearts',
    name: 'Tiny Hearts',
    emoji: '💗',
    css: `${svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'><path d='M28 40s-12-7.6-12-16a6.5 6.5 0 0 1 12-3.4A6.5 6.5 0 0 1 40 24c0 8.4-12 16-12 16z' fill='%23ff8fb3' fill-opacity='0.45'/></svg>`,
    )} repeat`,
  },
  {
    id: 'stars',
    name: 'Starry Sky',
    emoji: '⭐',
    css: `${svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><path d='M16 8l2.2 5.4L24 15.6l-5.4 2.2L16 24l-2.2-6.2L8 15.6l5.4-2.2z' fill='%23ffd76e' fill-opacity='0.6'/><path d='M46 34l1.7 4.2 4.3 1.7-4.3 1.7L46 46l-1.7-4.4-4.3-1.7 4.3-1.7z' fill='%23b8a6ff' fill-opacity='0.6'/></svg>`,
    )} repeat`,
  },
  {
    id: 'grid',
    name: 'Notebook Grid',
    emoji: '📐',
    css: `${svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M40 0H0v40' fill='none' stroke='%23a6c8ff' stroke-opacity='0.4' stroke-width='2'/></svg>`,
    )} repeat`,
  },
  {
    id: 'blossom',
    name: 'Sakura',
    emoji: '🌸',
    css: `${svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' width='72' height='72'><g fill='%23ffc2d8' fill-opacity='0.7'><circle cx='20' cy='20' r='5'/><circle cx='27' cy='14' r='5'/><circle cx='34' cy='20' r='5'/><circle cx='27' cy='27' r='5'/></g><circle cx='27' cy='20' r='3' fill='%23fff3a8'/><g fill='%23c8b6ff' fill-opacity='0.6'><circle cx='54' cy='52' r='4'/><circle cx='59' cy='47' r='4'/><circle cx='64' cy='52' r='4'/><circle cx='59' cy='57' r='4'/></g></svg>`,
    )} repeat`,
  },
  {
    id: 'checker',
    name: 'Picnic Check',
    emoji: '🧺',
    css: `${svgUrl(
      `<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='24' height='24' fill='%23ffd6e8' fill-opacity='0.5'/><rect x='24' y='24' width='24' height='24' fill='%23ffd6e8' fill-opacity='0.5'/></svg>`,
    )} repeat`,
  },
];

export function patternCss(id: string): string {
  return PATTERNS.find((p) => p.id === id)?.css ?? PATTERNS[0].css;
}

export const SOLID_SWATCHES = [
  '#ffd6e8',
  '#e3d1ff',
  '#cdeee4',
  '#cfe5ff',
  '#fff3c4',
  '#ffe9d6',
  '#f5f0ff',
  '#fffafd',
  '#1b1730',
  '#12101f',
];

export const GRADIENT_SWATCHES = [
  'linear-gradient(160deg, #ffe9f3 0%, #f0e6ff 45%, #e3f4ff 100%)',
  'linear-gradient(140deg, #ffd6e8 0%, #e3d1ff 50%, #cfe5ff 100%)',
  'linear-gradient(160deg, #d9f7e6 0%, #fdf3c4 100%)',
  'linear-gradient(135deg, #b8e1ff 0%, #e6d5ff 60%, #ffd9ec 100%)',
  'linear-gradient(160deg, #2a2660 0%, #171227 60%, #120e22 100%)',
  'radial-gradient(circle at 20% 20%, #ffd9ec 0%, transparent 55%), radial-gradient(circle at 80% 70%, #d5e7ff 0%, transparent 55%), #f7f2ff',
];

export const UI = {
  fonts: `"Fredoka", "Nunito", "Segoe UI Variable Display", "Segoe UI", "Comic Sans MS", sans-serif`,
};
