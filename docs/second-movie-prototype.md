# 2本目レコメンド + 館内フード注文 — プロトタイプ

> 既存 HALcinema（Next.js 15 + Prisma + PostgreSQL）に追加した発表用プロトタイプです。

## コンセプト

- **来場中の客**向けに、上映終了後の通知 → アンケート → **2本目限定価格** で別スクリーン上映を追加販売
- 映画終了後に **館内フード** をスマホ注文 → スクリーン入口前の受取カウンターで受け取り

通常予約（`/reserve`）では2本目価格は適用されません。**アンケート未回答では割引購入不可**です。

---

## ユーザーフロー

```
1本目上映終了
  → アプリ内通知「映画はいかがでしたか？」
  → アンケート（3問）回答
  → 2本目割引解放 + レコメンド表示
  → 別スクリーン上映を割引購入
```

デモ: 予約履歴の **「上映終了デモ（通知＋アンケート）」** または
`/mypage/history/[id]/after?simulateEnd=1`

通知一覧: `/mypage/notifications`（20秒ごとに自動確認）

---

## 画面

| パス | 内容 |
|---|---|
| `/now-showing` | API 上映一覧 |
| `/mypage/notifications` | 上映終了・割引解放の受信箱 |
| `/mypage/history/[bookingId]/after?simulateEnd=1` | アンケート → 2本目 + フード |
| `/reserve` | 通常予約（2本目価格なし） |

---

## 2本目推薦ロジック

1. **別スクリーン**のみ
2. **空席あり**
3. `上映開始 - 基準時刻 >= 移動時間 + 安全時間（デフォルト2分）`
4. **アンケート完了後のみ**レコメンド表示・割引購入可

---

## API

| Method | Path | 説明 |
|---|---|---|
| GET/PATCH | `/api/notifications` | 通知一覧 / 既読 |
| POST | `/api/after-movie/survey` | アンケート → 割引解放 |
| GET/POST | `/api/second-movie` | レコメンド / 購入（要アンケート） |

---

## セットアップ

```bash
npx prisma migrate deploy
npx prisma generate
node prisma/seed.js
```
