export interface FaqSearchItem {
  id: string;
  category: string;
  categoryLabel: string;
  question: string;
  answer: string;
}

export const FAQ_SEARCH_ITEMS: FaqSearchItem[] = [
  {
    id: 'ticket-1',
    category: 'ticket',
    categoryLabel: 'チケット・予約',
    question: 'チケットのキャンセル・変更はできますか？',
    answer: '上映開始の24時間前まであれば、マイページの予約履歴からキャンセルが可能です。キャンセル後は全額返金されます（振込手数料を除く）。座席の変更は一度キャンセルの上、再予約をお願いいたします。上映24時間を切った後のキャンセルはお受けできません。',
  },
  {
    id: 'ticket-2',
    category: 'ticket',
    categoryLabel: 'チケット・予約',
    question: '電子チケットはどこで確認できますか？',
    answer: '購入完了後、マイページの「電子チケット」または「予約履歴」からQRコードをご確認いただけます。Apple Wallet / Google Pay への追加にも対応しています。チケットの印刷も可能です（A4用紙をご用意ください）。',
  },
  {
    id: 'ticket-3',
    category: 'ticket',
    categoryLabel: 'チケット・予約',
    question: '購入できるチケット枚数に上限はありますか？',
    answer: '1回のご購入で最大6席までお選びいただけます。団体でのご利用（7名以上）をご希望の場合は、お問い合わせフォームよりお申し込みください。',
  },
  {
    id: 'seat-1',
    category: 'seat',
    categoryLabel: '座席・シアター',
    question: 'プレミアム席とは何ですか？',
    answer: 'プレミアム席（A・B列）は、スクリーンに最も近い前方区域で、上方投影に最適化されたリクライニング機能付き特別席です。通常料金より500円高くなりますが、没入感は最高クラスです。座席選択画面で金色表示の座席がプレミアム席です。',
  },
  {
    id: 'seat-2',
    category: 'seat',
    categoryLabel: '座席・シアター',
    question: '各シアターの違いを教えてください。',
    answer: 'HAL CINEMAには3種類のシアターがあります。Starry Theater：200席×3スクリーン。星空・宇宙をテーマにした大型ドーム型シアター。Abyss Theater：120席×2スクリーン。深海をコンセプトにした没入型シアター。Cyber Theater：70席×3スクリーン。最先端のLEDスクリーンと立体音響による没入型シネマ体験を提供します。',
  },
  {
    id: 'seat-3',
    category: 'seat',
    categoryLabel: '座席・シアター',
    question: '座席移動リクエスト（Seat Move）とは？',
    answer: '離れた席しか取れなかった場合でも、+100円で隣の席のお客様に席移動のリクエストを送ることができます。承諾してくださった方には100円のキャッシュバックがあります。詳細はログイン後の「特別機能」よりご確認ください。',
  },
  {
    id: 'payment-1',
    category: 'payment',
    categoryLabel: 'お支払い',
    question: '利用できる支払い方法は何ですか？',
    answer: 'クレジットカード（Visa / Mastercard / JCB / AmEx）、デビットカード、QRコード決済（PayPay / LINE Pay / メルペイ）、コンビニ決済（セブン-イレブン / ローソン / ファミリーマート / ミニストップ）に対応しています。',
  },
  {
    id: 'payment-2',
    category: 'payment',
    categoryLabel: 'お支払い',
    question: '領収書は発行できますか？',
    answer: 'はい、マイページ→予約履歴から各予約の領収書をPDF形式でダウンロードいただけます。宛名の変更はお問い合わせフォームよりご連絡ください。',
  },
  {
    id: 'member-1',
    category: 'member',
    categoryLabel: '会員',
    question: '会員ランクはどう決まりますか？',
    answer: '年間の来場回数とご利用金額に応じてランクが変わります。Standard（入会〜4回）→ Silver（5〜11回）→ Gold（12〜23回）→ Platinum（24回以上）。ランクが上がると割引率の向上、限定イベント招待、優先座席予約などの特典が増えます。',
  },
  {
    id: 'other-1',
    category: 'other',
    categoryLabel: 'その他',
    question: '障がい者割引はありますか？',
    answer: 'はい、障がい者手帳をお持ちの方とその介助者1名は、一般料金より400円の割引が適用されます。窓口でのご購入の際に手帳をご提示ください。オンライン購入の場合は予約後に窓口にてご精算いただきます。',
  },
  {
    id: 'other-2',
    category: 'other',
    categoryLabel: 'その他',
    question: '上映中に飲食はできますか？',
    answer: 'シアター内での飲食は可能ですが、においの強い食べ物や音が出る食べ物はご遠慮ください。ドリンク類はシネマカフェでお求めいただけます。持ち込みは蓋つきドリンクのみ可能です（アルコール類の持ち込みは不可）。',
  },
];
