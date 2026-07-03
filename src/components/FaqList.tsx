'use client';

import { useState } from 'react';
import s from './FaqList.module.css';

type Category = 'all' | 'ticket' | 'seat' | 'payment' | 'other';

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'ticket', label: 'チケット・予約' },
  { key: 'seat', label: '座席・シアター' },
  { key: 'payment', label: 'お支払い' },
  { key: 'other', label: 'その他' },
];

const FAQ_ITEMS: { category: Exclude<Category, 'all'>; question: string; answer: string }[] = [
  {
    category: 'ticket',
    question: 'チケットのキャンセル・変更はできますか？',
    answer:
      '上映開始の24時間前まであれば、マイページの予約履歴からキャンセルが可能です。キャンセル後は全額返金されます（振込手数料を除く）。座席の変更は一度キャンセルの上、再予約をお願いいたします。上映24時間を切った後のキャンセルはお受けできません。',
  },
  {
    category: 'ticket',
    question: '電子チケットはどこで確認できますか？',
    answer:
      '購入完了後、マイページの「予約履歴」から各予約の電子チケット（QRコード）をご確認いただけます。チケットの印刷も可能です（A4用紙をご用意ください）。',
  },
  {
    category: 'ticket',
    question: '購入できるチケット枚数に上限はありますか？',
    answer:
      '1回のご購入で最大6席までお選びいただけます。団体でのご利用（7名以上）をご希望の場合は、お問い合わせフォームよりお申し込みください。',
  },
  {
    category: 'seat',
    question: 'プレミアム席とは何ですか？',
    answer:
      'プレミアム席（A・B列）は、スクリーンに最も近い前方区域ですが、上方投影に最適化されたリクライニング機能付き特別席です。通常料金より500円高くなりますが、没入感は最高クラスです。座席選択画面で金色表示の座席がプレミアム席です。',
  },
  {
    category: 'seat',
    question: '各シアターの違いを教えてください。',
    answer:
      'HAL CINEMAには3種類のシアターがあります。Starry Theater（星空・宇宙をテーマにした大型ドーム型シアター）、Abyss Theater（深海をコンセプトにした没入型シアター）、Cyber Theater（最先端のLEDスクリーンと立体音響による没入型シネマ体験）です。',
  },
  {
    category: 'payment',
    question: '利用できる支払い方法は何ですか？',
    answer:
      'クレジットカード（Visa / Mastercard / JCB / AmEx）、デビットカード、QRコード決済（PayPay / LINE Pay / メルペイ）、コンビニ決済（セブン-イレブン / ローソン / ファミリーマート / ミニストップ）に対応しています。',
  },
  {
    category: 'other',
    question: '障がい者割引はありますか？',
    answer:
      'はい、障がい者手帳をお持ちの方とその介助者1名は、一般料金より400円の割引が適用されます。窓口でのご購入の際に手帳をご提示ください。オンライン購入の場合は予約後に窓口にてご精算いただきます。',
  },
  {
    category: 'other',
    question: '上映中に飲食はできますか？',
    answer:
      'シアター内での飲食は可能ですが、においの強い食べ物や音が出る食べ物はご遠慮ください。ドリンク類はシネマカフェでお求めいただけます。持ち込みは蓋つきドリンクのみ可能です（アルコール類の持ち込みは不可）。',
  },
];

export default function FaqList() {
  const [category, setCategory] = useState<Category>('all');

  const items = FAQ_ITEMS.filter((item) => category === 'all' || item.category === category);

  return (
    <div>
      <div className={s.cats}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            className={`${s.filterBtn} ${category === cat.key ? s.filterBtnActive : ''}`}
            onClick={() => setCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className={s.list}>
        {items.map((item) => (
          <details key={item.question} className={s.item}>
            <summary className={s.question}>
              <span className={s.qMark}>Q</span>
              <span className={s.questionText}>{item.question}</span>
              <span className={s.chevron}>+</span>
            </summary>
            <div className={s.answer}>{item.answer}</div>
          </details>
        ))}
      </div>
    </div>
  );
}
