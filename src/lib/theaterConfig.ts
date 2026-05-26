export type TheaterId = 'starry' | 'abyss' | 'cyber';

export const THEATER_IDS: TheaterId[] = ['starry', 'abyss', 'cyber'];

export interface TheaterConfig {
  id: TheaterId;
  name: string;
  shortLabel: string;
  href: string;
  meta: string;
  heroImage: string;
  heroCaption: string;
}

export const THEATER_CONFIG: Record<TheaterId, TheaterConfig> = {
  starry: {
    id: 'starry',
    name: 'Starry Theater',
    shortLabel: 'STARRY',
    href: '/theaters#starry',
    meta: '200席 × 3スクリーン',
    heroImage: '/images/starry/starry1.png',
    heroCaption: 'Starry Theater',
  },
  abyss: {
    id: 'abyss',
    name: 'Abyss Theater',
    shortLabel: 'ABYSS',
    href: '/theaters#abyss',
    meta: '120席 × 2スクリーン',
    heroImage: '/images/abyss/abyss1.png',
    heroCaption: 'Abyss Theater',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Theater',
    shortLabel: 'CYBER',
    href: '/theaters#cyber',
    meta: '70席 × 3スクリーン',
    heroImage: '/images/cyber/cyber1.png',
    heroCaption: 'Cyber Theater',
  },
};
