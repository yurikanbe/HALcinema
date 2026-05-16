// ── Movie ────────────────────────────────────────────────────────
export interface Movie {
  id: string;
  title: string;
  category: string;
  poster: string;
  description: string;
  duration: number;        // minutes
  year: number;
  rating: string;          // "G" | "PG12" | "R15+" | "R18+"
  formats: string[];       // ["字幕", "吹替"]
  cast: string[];
  director: string;
  status: 'now_showing' | 'coming_soon';
  colors?: {
    solid: string;
    fade: string;
  };
}

// ── Theater ──────────────────────────────────────────────────────
export interface TheaterGalleryPhoto {
  src: string;
  caption: string;
}

export interface Theater {
  id: 'starry' | 'abyss' | 'cyber';
  name: string;
  tagline: string;
  concept: string;
  description: string;
  seats: number;
  screens: number;
  features: string[];
  heroImage: string;
  gallery: TheaterGalleryPhoto[];
  stats: { label: string; value: string }[];
}

// ── Schedule ─────────────────────────────────────────────────────
export interface Show {
  movieId: string;
  title: string;
  start: string;          // "HH:MM"
  duration: number;       // minutes
  format: string;         // "字幕" | "吹替" | "字幕・吹替"
  seats?: number;         // remaining seats; absent if taken
  taken?: boolean;
}

export interface ScreenSchedule {
  theaterId: 'starry' | 'abyss' | 'cyber';
  screen: string;         // "Screen 1" etc.
  shows: Show[];
}

// ── News ─────────────────────────────────────────────────────────
export type NewsCategory = 'campaign' | 'event' | 'info';

export interface NewsItem {
  id: string;
  title: string;
  category: NewsCategory;
  date: string;           // ISO date "YYYY-MM-DD"
  featured?: boolean;
  excerpt: string;
  body: string;           // HTML or plain text content
  imageGradient?: string; // CSS gradient for thumbnail
}

// ── Menu ─────────────────────────────────────────────────────────
export interface MenuItem {
  id: string;
  name: string;
  tag: string;
  image: string;
  description: string;
}

// ── Booking (localStorage – Phase 1 stub) ────────────────────────
export interface BookingData {
  movieId?: string;
  movieTitle?: string;
  poster?: string;
  category?: string;
  theater?: string;
  screen?: string;
  time?: string;
  date?: string;
  dateLabel?: string;
}
