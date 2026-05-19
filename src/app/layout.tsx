import type { Metadata } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'HAL CINEMA | Dive into Cinema',
  description: 'Starry / Abyss / Cyber — 3つのコンセプト空間。HAL CINEMAは名古屋が誇る立体没入型シアターです。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <div className="bg-stack" aria-hidden="true">
          <span className="bg-layer bg-layer--1"></span>
          <span className="bg-layer bg-layer--2"></span>
          <span className="bg-layer bg-layer--3"></span>
          <span className="bg-layer bg-layer--4"></span>
        </div>
        <div className="accent-lines accent-lines--1" aria-hidden="true"></div>
        <div className="accent-lines accent-lines--2" aria-hidden="true"></div>
        <div className="accent-lines accent-lines--3" aria-hidden="true"></div>
        <div className="accent-lines accent-lines--short-1" aria-hidden="true"></div>
        <div className="accent-lines accent-lines--short-2" aria-hidden="true"></div>
        <div className="accent-lines accent-lines--short-3" aria-hidden="true"></div>
        <div className="accent-lines accent-lines--short-4" aria-hidden="true"></div>
        <div className="accent-lines accent-lines--short-5" aria-hidden="true"></div>
        <div className="accent-lines accent-lines--short-6" aria-hidden="true"></div>
        <div className="accent-lines accent-lines--short-7" aria-hidden="true"></div>
        <div className="page">
          <Nav />
          {children}
          <Footer />
        </div>
      </body>
    </html>
  );
}
