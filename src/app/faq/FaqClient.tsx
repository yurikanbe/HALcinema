'use client';

import { useMemo, useState, useEffect } from 'react';
import shared from '@/styles/shared.module.css';
import styles from './page.module.css';

const CATEGORIES = [
  { id: 'all', label: 'すべて' },
  { id: 'ticket', label: 'チケット・予約' },
  { id: 'seat', label: '座席・シアター' },
  { id: 'payment', label: 'お支払い' },
  { id: 'member', label: '会員' },
  { id: 'other', label: 'その他' },
];

type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: React.ReactNode;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'ticket-1',
    category: 'ticket',
    question: 'チケットのキャンセル・変更はできますか？',
    answer: (
      <>
        上映開始の24時間前まであれば、マイページの予約履歴からキャンセルが可能です。
        キャンセル後は全額返金されます（振込手数料を除く）。座席の変更は一度キャンセルの上、再予約をお願いいたします。
        上映24時間を切った後のキャンセルはお受けできません。
      </>
    ),
  },
  {
    id: 'ticket-2',
    category: 'ticket',
    question: '電子チケットはどこで確認できますか？',
    answer: (
      <>
        購入完了後、マイページの「電子チケット」または「予約履歴」からQRコードをご確認いただけます。
        Apple Wallet / Google Pay への追加にも対応しています。チケットの印刷も可能です（A4用紙をご用意ください）。
      </>
    ),
  },
  {
    id: 'ticket-3',
    category: 'ticket',
    question: '購入できるチケット枚数に上限はありますか？',
    answer: (
      <>
        1回のご購入で最大6席までお選びいただけます。
        団体でのご利用（7名以上）をご希望の場合は、お問い合わせフォームよりお申し込みください。
      </>
    ),
  },
  {
    id: 'seat-1',
    category: 'seat',
    question: 'プレミアム席とは何ですか？',
    answer: (
      <>
        プレミアム席（A・B列）は、スクリーンに最も近い前方区域ですが、上方投影に最適化されたリクライニング機能付き特別席です。
        通常料金より500円高くなりますが、没入感は最高クラスです。座席選択画面で金色表示の座席がプレミアム席です。
      </>
    ),
  },
  {
    id: 'seat-2',
    category: 'seat',
    question: '各シアターの違いを教えてください。',
    answer: (
      <>
        HAL CINEMAには3種類のシアターがあります。
        <br />
        <strong>Starry Theater</strong>：200席×3スクリーン。星空・宇宙をテーマにした大型ドーム型シアター。
        <br />
        <strong>Abyss Theater</strong>：120席×2スクリーン。深海をコンセプトにした没入型シアター。
        <br />
        <strong>Cyber Theater</strong>：70席×3スクリーン。最先端のLEDスクリーンと立体音響による没入型シネマ体験を提供します。
      </>
    ),
  },
  {
    id: 'seat-3',
    category: 'seat',
    question: '座席移動リクエスト（Seat Move）とは？',
    answer: (
      <>
        離れた席しか取れなかった場合でも、+100円で隣の席のお客様に席移動のリクエストを送ることができます。
        承諾してくださった方には100円のキャッシュバックがあります。詳細はログイン後の「特別機能」よりご確認ください。
      </>
    ),
  },
  {
    id: 'payment-1',
    category: 'payment',
    question: '利用できる支払い方法は何ですか？',
    answer: (
      <>
        クレジットカード（Visa / Mastercard / JCB / AmEx）、デビットカード、QRコード決済（PayPay / LINE Pay / メルペイ）、
        コンビニ決済（セブン-イレブン / ローソン / ファミリーマート / ミニストップ）に対応しています。
      </>
    ),
  },
  {
    id: 'payment-2',
    category: 'payment',
    question: '領収書は発行できますか？',
    answer: (
      <>
        はい、マイページ→予約履歴から各予約の領収書をPDF形式でダウンロードいただけます。
        宛名の変更はお問い合わせフォームよりご連絡ください。
      </>
    ),
  },
  {
    id: 'member-1',
    category: 'member',
    question: '会員ランクはどう決まりますか？',
    answer: (
      <>
        年間の来場回数とご利用金額に応じてランクが変わります。
        <br />
        Standard（入会〜4回）→ Silver（5〜11回）→ Gold（12〜23回）→ Platinum（24回以上）。
        <br />
        ランクが上がると割引率の向上、限定イベント招待、優先座席予約などの特典が増えます。
      </>
    ),
  },
  {
    id: 'other-1',
    category: 'other',
    question: '障がい者割引はありますか？',
    answer: (
      <>
        はい、障がい者手帳をお持ちの方とその介助者1名は、一般料金より400円の割引が適用されます。
        窓口でのご購入の際に手帳をご提示ください。オンライン購入の場合は予約後に窓口にてご精算いただきます。
      </>
    ),
  },
  {
    id: 'other-2',
    category: 'other',
    question: '上映中に飲食はできますか？',
    answer: (
      <>
        シアター内での飲食は可能ですが、においの強い食べ物や音が出る食べ物はご遠慮ください。
        ドリンク類はシネマカフェでお求めいただけます。持ち込みは蓋つきドリンクのみ可能です（アルコール類の持ち込みは不可）。
      </>
    ),
  },
];

export default function FaqClient() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [showBackTop, setShowBackTop] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function toggleFaq(id: string) {
    setOpenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    category: 'チケット・予約について',
    subject: '',
    message: '',
  });

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') {
      return FAQ_ITEMS;
    }
    return FAQ_ITEMS.filter(item => item.category === activeCategory);
  }, [activeCategory]);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = event.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValues.name || !formValues.email || !formValues.message) {
      window.alert('お名前、メールアドレス、お問い合わせ内容を入力してください');
      return;
    }
    setSubmitted(true);
  }

  return (
    <>
      <section className={`${shared.section} ${styles.sectionTight}`}>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>FAQ</div>
            <h2 className={shared.sectionTitle}>よくあるご質問</h2>
          </div>
        </div>

        <div className={styles.faqCats}>
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              type="button"
              className={`${shared.filterBtn} ${activeCategory === category.id ? shared.filterBtnActive : ''}`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className={styles.faqList}>
          {filteredItems.map(item => {
            const isOpen = openIds.has(item.id);
            return (
              <div key={item.id} className={styles.faqItem} data-open={isOpen ? 'true' : undefined} data-cat={item.category}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => toggleFaq(item.id)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.faqQMark}>Q</span>
                  <span className={styles.faqQuestionText}>{item.question}</span>
                  <span className={styles.faqChevron}>+</span>
                </button>
                <div className={styles.faqAnswerWrap}>
                  <div className={styles.faqAnswerInner}>
                    <div className={styles.faqAnswer}>{item.answer}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={`${shared.section} ${styles.sectionContact}`}>
        <div className={shared.sectionHead}>
          <div>
            <div className={shared.sectionHint}>Contact</div>
            <h2 className={shared.sectionTitle}>お問い合わせ</h2>
          </div>
        </div>

        <div className={shared.featureTiles}>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>Hours</div>
            <h3 className={shared.featureTileTitle}>受付時間</h3>
            <p className={shared.featureTileDesc}>
              平日 10:00〜20:00 / 土日祝 10:00〜18:00
              <br />
              ※ 年末年始を除く
            </p>
          </div>
          <div className={shared.featureTile}>
            <div className={shared.featureTileBadge}>Response</div>
            <h3 className={shared.featureTileTitle}>回答目安</h3>
            <p className={shared.featureTileDesc}>
              お問い合わせ受領後2〜3営業日以内にご返信いたします
            </p>
          </div>
        </div>

        <div className={styles.contactForm}>
          <div className={styles.subHeading}>お問い合わせフォーム</div>
          {!submitted ? (
            <form onSubmit={handleSubmit} className={styles.formBody}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="c-name">お名前</label>
                  <input
                    className={styles.formInput}
                    id="c-name"
                    name="name"
                    type="text"
                    placeholder="山田 太郎"
                    value={formValues.name}
                    onChange={handleInputChange}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel} htmlFor="c-email">メールアドレス</label>
                  <input
                    className={styles.formInput}
                    id="c-email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formValues.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="c-category">お問い合わせ種別</label>
                <select
                  className={styles.formSelect}
                  id="c-category"
                  name="category"
                  value={formValues.category}
                  onChange={handleInputChange}
                >
                  <option>チケット・予約について</option>
                  <option>座席・シアターについて</option>
                  <option>お支払いについて</option>
                  <option>会員について</option>
                  <option>施設・設備について</option>
                  <option>その他</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="c-subject">件名</label>
                <input
                  className={styles.formInput}
                  id="c-subject"
                  name="subject"
                  type="text"
                  placeholder="お問い合わせの件名"
                  value={formValues.subject}
                  onChange={handleInputChange}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="c-message">お問い合わせ内容</label>
                <textarea
                  className={styles.formTextarea}
                  id="c-message"
                  name="message"
                  placeholder="詳しい内容をご記入ください..."
                  value={formValues.message}
                  onChange={handleInputChange}
                />
              </div>
              <button className={`${shared.btn} ${shared.btnSolid} ${styles.submitBtn}`} type="submit">
                送信する
              </button>
            </form>
          ) : (
            <div className={styles.contactSuccess} role="status">
              <div className={styles.successIcon} aria-hidden="true">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <div className={styles.successTitle}>お問い合わせを受け付けました</div>
              <div className={styles.successNote}>2〜3営業日以内にご返信いたします</div>
            </div>
          )}
        </div>
      </section>

      <button
        className={`${shared.backToTop}${showBackTop ? ' ' + shared.backToTopVisible : ''}`}
        aria-label="ページトップへ戻る"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      </button>
    </>
  );
}
