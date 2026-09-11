'use client';

import { useEffect, useMemo, useState } from 'react';
import shared from '@/styles/shared.module.css';
import s from './ConcessionOrderPanel.module.css';

interface Product {
  id: string;
  nameJa: string;
  category: string;
  price: number;
}

interface PickupCounter {
  id: string;
  name: string;
  locationLabel: string;
  screenLabel: string;
}

interface ConcessionOrderPanelProps {
  bookingId?: string;
  fromScreenId?: string;
}

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`;
}

export default function ConcessionOrderPanel({ bookingId, fromScreenId }: ConcessionOrderPanelProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [counters, setCounters] = useState<PickupCounter[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [pickupCounterId, setPickupCounterId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ pickupCode: string; locationLabel: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [productsRes, countersRes] = await Promise.all([
        fetch('/api/concession/products', { cache: 'no-store' }),
        fetch(
          `/api/concession/pickup-counters${fromScreenId ? `?fromScreenId=${fromScreenId}` : ''}`,
          { cache: 'no-store' },
        ),
      ]);
      const productsData = await productsRes.json();
      const countersData = await countersRes.json();
      setProducts(productsData.products ?? []);
      const loadedCounters = countersData.counters ?? [];
      setCounters(loadedCounters);
      if (loadedCounters[0]) setPickupCounterId(loadedCounters[0].id);
    }
    load();
  }, [fromScreenId]);

  const total = useMemo(
    () =>
      products.reduce((sum, product) => {
        const qty = quantities[product.id] ?? 0;
        return sum + product.price * qty;
      }, 0),
    [products, quantities],
  );

  const selectedCount = useMemo(
    () => Object.values(quantities).reduce((sum, qty) => sum + qty, 0),
    [quantities],
  );

  const adjustQty = (productId: string, delta: number) => {
    setQuantities((prev) => {
      const next = Math.max(0, Math.min(5, (prev[productId] ?? 0) + delta));
      return { ...prev, [productId]: next };
    });
  };

  const submitOrder = async () => {
    if (submitting || selectedCount === 0 || !pickupCounterId) return;
    setSubmitting(true);
    setError(null);
    try {
      const items = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([productId, quantity]) => ({ productId, quantity }));

      const res = await fetch('/api/concession/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          pickupCounterId,
          items,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '注文に失敗しました');
      setResult({
        pickupCode: data.order.pickupCode,
        locationLabel: data.order.pickupCounter.locationLabel,
      });
      setQuantities({});
    } catch (err) {
      setError(err instanceof Error ? err.message : '注文に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={s.panel} id="concession-order">
      <div className={shared.sectionHint}>In-Theater Order</div>
      <h2 className={s.title}>館内フード注文</h2>
      <p className={s.lead}>
        ロビーまで出ずに注文できます。各スクリーン入り口前に<strong>受取カウンター2か所</strong>を設置しています。
      </p>

      {result ? (
        <div className={s.resultBox} role="status">
          <div className={s.resultTitle}>ご注文を受け付けました</div>
          <div className={s.pickupCode}>{result.pickupCode}</div>
          <p className={s.resultText}>受取場所: {result.locationLabel}</p>
          <button type="button" className={shared.btn} onClick={() => setResult(null)}>
            追加で注文する
          </button>
        </div>
      ) : (
        <>
          <div className={s.counterSelect}>
            <label htmlFor="pickup-counter">受取カウンター</label>
            <select
              id="pickup-counter"
              value={pickupCounterId}
              onChange={(e) => setPickupCounterId(e.target.value)}
            >
              {counters.map((counter) => (
                <option key={counter.id} value={counter.id}>
                  {counter.screenLabel} — {counter.name}（{counter.locationLabel}）
                </option>
              ))}
            </select>
          </div>

          <div className={s.productGrid}>
            {products.map((product) => (
              <div key={product.id} className={s.productCard}>
                <div>
                  <div className={s.productCategory}>{product.category}</div>
                  <div className={s.productName}>{product.nameJa}</div>
                  <div className={s.productPrice}>{formatYen(product.price)}</div>
                </div>
                <div className={s.qtyControls}>
                  <button type="button" aria-label="減らす" onClick={() => adjustQty(product.id, -1)}>
                    −
                  </button>
                  <span>{quantities[product.id] ?? 0}</span>
                  <button type="button" aria-label="増やす" onClick={() => adjustQty(product.id, 1)}>
                    ＋
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && <p className={s.error}>{error}</p>}

          <div className={s.footer}>
            <strong>{formatYen(total)}</strong>
            <button
              type="button"
              className={`${shared.btn} ${shared.btnSolid}`}
              disabled={submitting || selectedCount === 0}
              onClick={submitOrder}
            >
              {submitting ? '注文中…' : 'ワンクリック注文（モック決済）'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
