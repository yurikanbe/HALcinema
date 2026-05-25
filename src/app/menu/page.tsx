'use client';

import { Fragment, useRef, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useLightboxKeyboard } from '@/hooks/useLightboxKeyboard';
import BackToTop from '@/components/BackToTop';
import shared from '@/styles/shared.module.css';
import s from './page.module.css';

const MENU_ITEMS = [
  { id: 'popcorn', title: 'ポップコーン', tag: 'Snack',       src: '/images/menu/popcorn.png',
    desc: '王道の塩から塩バター、キャラメル、塩キャラメル、\n\nミックスまで、選べる組み合わせが豊富。\n\nお子様やおひとりさま向けの小さいサイズも\n\nご用意しています。' },
  { id: 'drink',   title: 'ドリンク',     tag: 'Drink',       src: '/images/menu/drink.png',
    desc: 'コーラやレモンスカッシュなどのアイスドリンク、\n\nホットコーヒーやラテまで種類が豊富。\n\nさらに星空をイメージした「Stella Horizon」と\n\n深海の「Deep Sea Melody」の\n\nオリジナルドリンクもご用意しています。' },
  { id: 'food',    title: 'フード',       tag: 'Food',        src: '/images/menu/food.png',
    desc: '種類豊富なラインナップ。\n\n食べ比べたり、シェアしたり、\n\nそのときの気分に合わせて楽しめる。\n\n小腹を満たすサイズ展開もそろっています。' },
  { id: 'sweets',  title: 'スイーツ',     tag: 'Sweets',      src: '/images/menu/sweets.png',
    desc: 'チュロス、クレープ、アイス＆ソフトなど、\n\n映画時間にぴったりの甘いメニューが勢ぞろい。\n\n星空を閉じ込めた「星空シアターパルフェ」と\n\n深海のきらめきを映した「深海のパールサンデー」の\n\nオリジナルスイーツもお楽しみいただけます。' },
  { id: 'set',     title: 'お得なセット', tag: 'Recommended', src: '/images/menu/set.png',
    desc: 'ポップコーンセット、ホットドッグセット、\n\nナチョスセット、スイーツセットまで、\n\nお好きなメニューとドリンクを組み合わせた\n\nセットをご用意。\n\n手軽に楽しめる定番から、\n\nシアターオリジナルのスペシャルセットまで。' },
];

const TICKET_PRICES = [
  { name: '一般',          sub: 'General',                   amount: '1,800' },
  { name: '大学生等',      sub: 'University / College',       amount: '1,600' },
  { name: '中学・高校生',  sub: 'Junior High / High School', amount: '1,400' },
  { name: '小学生・幼児',  sub: 'Children',                  amount: '1,000' },
];

const LOCAL_NAV = [
  {
    href: '#section-ticket', label: 'チケット料金',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  },
  {
    href: '#popcorn', label: 'ポップコーン',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v3m8-3v3"/><path d="M5 5h14l-1.5 14h-11z"/><path d="M9 11h6"/></svg>,
  },
  {
    href: '#drink', label: 'ドリンク',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/></svg>,
  },
  {
    href: '#food', label: 'フード',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="2" x2="8" y2="22"/><path d="M5 2v7a3 3 0 0 0 6 0V2"/><line x1="17" y1="2" x2="17" y2="22"/></svg>,
  },
  {
    href: '#sweets', label: 'スイーツ',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  },
  {
    href: '#set', label: 'お得なセット',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  },
];

const SCROLL_IDS = ['section-ticket', 'popcorn', 'drink', 'food', 'sweets', 'set'];

export default function MenuPage() {
  const [lbIndex, setLbIndex] = useState<number | null>(null);
  const [activeNav, setActiveNav] = useState('section-ticket');
  const lbImgRef = useRef<HTMLImageElement>(null);
  const animating = useRef(false);

  useEffect(() => { document.title = 'HAL CINEMA | 料金・メニュー'; }, []);

  useEffect(() => {
    const targets = SCROLL_IDS.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveNav((entry.target as HTMLElement).id);
      });
    }, { rootMargin: '-15% 0px -75% 0px', threshold: 0 });
    targets.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);

  const navigate = useCallback((dir: number) => {
    if (animating.current) return;
    const img = lbImgRef.current;
    if (!img) return;

    animating.current = true;
    const outX = dir > 0 ? '-90px' : '90px';
    const inX  = dir > 0 ?  '90px' : '-90px';

    img.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
    img.style.transform  = `translateX(${outX})`;
    img.style.opacity    = '0';

    setTimeout(() => {
      setLbIndex(i => i === null ? null : (i + dir + MENU_ITEMS.length) % MENU_ITEMS.length);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = lbImgRef.current;
          if (!el) { animating.current = false; return; }
          el.style.transition = 'none';
          el.style.transform  = `translateX(${inX})`;
          el.style.opacity    = '0';
          el.offsetHeight;
          el.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
          el.style.transform  = 'translateX(0)';
          el.style.opacity    = '1';
          setTimeout(() => { animating.current = false; }, 260);
        });
      });
    }, 200);
  }, []);

  useLightboxKeyboard({
    isOpen: lbIndex !== null,
    onClose: () => setLbIndex(null),
    onPrev:  () => navigate(-1),
    onNext:  () => navigate(1),
  });

  const lbItem = lbIndex !== null ? MENU_ITEMS[lbIndex] : null;

  return (
    <>
      <section className={shared.pageHero}>
        <div className={shared.sectionHint}>Pricing &amp; Menu</div>
        <h1 className={shared.pageHeroTitle}>料金・メニュー</h1>
        <p className={shared.pageHeroLead}>チケット料金とシアター内でお楽しみいただけるフード＆ドリンクのご案内です。</p>
      </section>

      {/* Local Nav */}
      <nav className={s.localNav} aria-label="ページ内ナビゲーション">
        <div className={s.localNavInner}>
          {LOCAL_NAV.map((item, i) => (
            <Fragment key={item.href}>
              {i === 1 && <div className={s.localNavSep} />}
              <a
                className={`${s.localNavItem}${activeNav === item.href.replace('#', '') ? ' ' + s.localNavItemActive : ''}`}
                href={item.href}
              >
                {item.icon}
                {item.label}
              </a>
            </Fragment>
          ))}
        </div>
      </nav>

      {/* Ticket Pricing */}
      <section className={`${shared.section} ${s.sectionTicketPt}`} id="section-ticket">
        <div className={`${shared.sectionHead} ${s.ticketSectionHead}`}>
          <div>
            <div className={shared.sectionHint}>Ticket Pricing</div>
            <h2 className={shared.sectionTitle}>チケット料金</h2>
          </div>
          <Link href="/reserve" className={`${shared.btn} ${shared.btnSolid} ${s.reserveBtnSmall}`}>
            チケット購入について
          </Link>
        </div>

        <div className={s.ticketLayout}>
          <div className={shared.priceListPanel}>
            {TICKET_PRICES.map(row => (
              <div key={row.name} className={shared.priceListRow}>
                <div>
                  <div className={shared.priceListRowName}>{row.name}</div>
                  <div className={shared.priceListRowSub}>{row.sub}</div>
                </div>
                <div className={shared.priceListRowRight}>
                  <span className={shared.priceListRowAmount}>{row.amount}</span>
                  <span className={shared.priceListRowUnit}>円</span>
                </div>
              </div>
            ))}
            <div className={shared.priceListFooter}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              プレミアム席あり（+¥500）
            </div>
          </div>

          <div className={s.ticketNotePanel}>
            <div className={s.ticketNotePanelEyebrow}>Notes</div>
            <h3 className={s.ticketNotePanelTitle}>ご購入前にご確認ください</h3>
            <ul className={s.ticketNoteList}>
              <li>チケット料金は税込です。</li>
              <li>大学生等割引には、学生証のご提示が必要です。</li>
              <li>中学・高校生割引には、学生証または生徒手帳のご提示が必要です。</li>
              <li>小学生・幼児の方は保護者の同伴が必要な作品があります。</li>
              <li>チケットは劇場窓口にてご購入ください。</li>
              <li>電子チケットは当日スマートフォンで入場ゲートにご提示ください。</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Food & Drinks */}
      <section className={`${shared.section} ${s.sectionMenuPt}`} id="section-menu">
        <div className={`${shared.sectionHead} ${s.ticketSectionHead}`}>
          <div>
            <div className={shared.sectionHint}>Food &amp; Drinks</div>
            <h2 className={shared.sectionTitle}>フード＆ドリンク</h2>
          </div>
        </div>

        <div className={s.menuGrid}>
          {MENU_ITEMS.map((item, idx) => (
            <div key={item.id} className={s.menuSection} id={item.id}>
              <h3 className={s.menuSectionTitle}>{item.title}</h3>
              <div className={s.menuSectionBody}>
                <div className={s.menuImgCard} onClick={() => setLbIndex(idx)}>
                  <img src={item.src} alt={item.title} />
                </div>
                <p className={s.menuSectionDesc}>
                  {item.desc.split('\n\n').map((p, i) => (
                    <span key={i}>{i > 0 && <><br /><br /></>}{p}</span>
                  ))}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className={s.menuNote}>
          ※ 表示価格は税込です。メニューの内容・価格は予告なく変更する場合があります。<br />
          ※ フード＆ドリンクはシアター内へお持ち込みいただけます。
        </p>
      </section>

      <BackToTop threshold={400} />

      {/* Lightbox */}
      {lbItem && (
        <div className={`${s.lightbox} ${s.lightboxOpen}`} role="dialog" aria-modal="true">
          <div className={s.lightboxBackdrop} onClick={() => setLbIndex(null)} />
          <div className={s.lightboxCounter}>{(lbIndex ?? 0) + 1} / {MENU_ITEMS.length}</div>
          <button className={s.lightboxClose} aria-label="閉じる" onClick={() => setLbIndex(null)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <button className={`${s.lightboxNav} ${s.lightboxNavPrev}`} aria-label="前へ" onClick={() => navigate(-1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button className={`${s.lightboxNav} ${s.lightboxNavNext}`} aria-label="次へ" onClick={() => navigate(1)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div className={s.lightboxInner}>
            <img ref={lbImgRef} className={s.lightboxImg} src={lbItem.src} alt={lbItem.title} />
            <div className={s.lightboxCaption}>
              <span className={s.lightboxCaptionTag}>{lbItem.tag}</span>
              <span className={s.lightboxCaptionDot}></span>
              <span className={s.lightboxCaptionName}>{lbItem.title}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
