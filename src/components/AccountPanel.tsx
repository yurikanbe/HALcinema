'use client';

import { useEffect, useState } from 'react';
import shared from '@/styles/shared.module.css';
import s from './AccountPanel.module.css';

interface SavedCard {
  name: string;
  expiry: string;
  last4: string;
}

const CARD_STORAGE_KEY = 'hal_cinema_account_card';

export default function AccountPanel({
  name,
  email,
  memberId,
}: {
  name: string;
  email: string;
  memberId: string;
}) {
  const [displayName, setDisplayName] = useState(name);
  const [displayEmail, setDisplayEmail] = useState(email);
  const [phone, setPhone] = useState('');

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [savedCard, setSavedCard] = useState<SavedCard | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CARD_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedCard;
        setSavedCard(parsed);
        setCardName(parsed.name ?? '');
        setCardExpiry(parsed.expiry ?? '');
      }
    } catch {
      // ignore malformed local storage data
    }
  }, []);

  const handleSaveCard = () => {
    const rawNumber = cardNumber.replace(/\s+/g, '');
    const last4 = rawNumber.slice(-4);
    if (rawNumber.length < 12) {
      window.alert('カード番号を確認してください。');
      return;
    }
    const next: SavedCard = { name: cardName, expiry: cardExpiry, last4 };
    localStorage.setItem(CARD_STORAGE_KEY, JSON.stringify(next));
    setSavedCard(next);
    setCardNumber('');
    setCardCvc('');
    window.alert('クレジットカードを登録しました。');
  };

  const handleReset = () => {
    setDisplayName(name);
    setDisplayEmail(email);
    setPhone('');
    setCardName(savedCard?.name ?? '');
    setCardExpiry(savedCard?.expiry ?? '');
    setCardNumber('');
    setCardCvc('');
  };

  return (
    <div className={s.shell}>
      <div className={s.panel}>
        <div className={s.badge}>Member Profile</div>
        <div className={s.name}>{displayName || 'ゲスト会員'}</div>
        <div className={s.meta}>会員番号: {memberId}</div>

        <div className={s.pills}>
          <div className={s.pill}>優先座席案内</div>
          <div className={s.pill}>シネマニュース配信</div>
        </div>

        <div className={s.card}>
          <div className={s.cardLabel}>Registered Card</div>
          <div className={s.cardNumber}>
            {savedCard?.last4 ? `**** **** **** ${savedCard.last4}` : '**** **** **** ----'}
          </div>
          <div className={s.cardMeta}>
            <div>{savedCard?.name || 'CARDHOLDER'}</div>
            <div>{savedCard?.expiry || 'MM/YY'}</div>
          </div>
        </div>

        <div className={s.note}>カード情報は下4桁のみ保存されます。</div>
      </div>

      <div className={s.column}>
        <div className={s.panel}>
          <div className={s.sectionTitle}>会員情報</div>
          <div className={s.form}>
            <label className={s.field}>
              <div className={s.fieldLabel}>氏名</div>
              <input
                className={s.input}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="HAL 太郎"
              />
              <div className={s.fieldHint}>チケット表示名に反映されます</div>
            </label>
            <label className={s.field}>
              <div className={s.fieldLabel}>メールアドレス</div>
              <input
                className={s.input}
                type="email"
                value={displayEmail}
                onChange={(e) => setDisplayEmail(e.target.value)}
                placeholder="cinema@example.jp"
              />
              <div className={s.fieldHint}>予約確認メールの送信先</div>
            </label>
            <label className={s.field}>
              <div className={s.fieldLabel}>電話番号</div>
              <input
                className={s.input}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="090-0000-0000"
              />
            </label>
          </div>
        </div>

        <div className={s.panel}>
          <div className={s.sectionTitle}>クレジットカード登録</div>
          <div className={s.form}>
            <label className={s.field}>
              <div className={s.fieldLabel}>カード名義</div>
              <input
                className={s.input}
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="HAL TARO"
              />
            </label>
            <label className={s.field}>
              <div className={s.fieldLabel}>カード番号</div>
              <input
                className={s.input}
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="1234 5678 9012 3456"
              />
              <div className={s.fieldHint}>数字のみ入力してください</div>
            </label>
            <div className={s.split}>
              <label className={s.field}>
                <div className={s.fieldLabel}>有効期限</div>
                <input
                  className={s.input}
                  type="text"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="MM/YY"
                />
              </label>
              <label className={s.field}>
                <div className={s.fieldLabel}>セキュリティコード</div>
                <input
                  className={s.input}
                  type="password"
                  inputMode="numeric"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  placeholder="123"
                />
              </label>
            </div>
          </div>

          {savedCard?.last4 && <div className={s.savedNote}>登録済み: **** **** **** {savedCard.last4}</div>}

          <div className={s.actions}>
            <button type="button" className={`${shared.btn} ${shared.btnSolid}`} onClick={handleSaveCard}>
              変更を保存
            </button>
            <button type="button" className={shared.btn} onClick={handleReset}>
              リセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
