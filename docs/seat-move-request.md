# 席交換リクエスト機能（DB連携版）

`seat_move_requests` テーブルを使い、確定済み予約同士で座席の交換をリクエスト・承認・拒否できる機能。旧実装はブラウザの `localStorage` に依存したプロトタイプだったため、実際の予約DB（Booking / BookingSeat / ScreeningSeatLock）と連動する形に作り直した。

## 画面

| パス | 概要 |
|---|---|
| `/mypage/seat-move` | 席交換リクエストのメイン画面。ログイン必須。クエリ `?bookingId=` で対象予約を初期選択できる |
| `/mypage` | メニューに「席交換リクエスト」カードを追加 |
| `/mypage/history` | 各予約カードに「席交換リクエスト」リンクを追加（`CONFIRMED` かつ今後の予約のみ表示） |

対象は **ログインユーザーの `CONFIRMED` かつ上映開始前の予約のみ**（`/mypage/seat-move/page.tsx` でサーバー側フィルタ）。ゲスト予約は対象外。

## コンポーネント

- [`src/components/SeatMoveFlow.tsx`](../src/components/SeatMoveFlow.tsx)
  - `bookings`（ログインユーザーの対象予約一覧）と `initialBookingId` を props で受け取るクライアントコンポーネント
  - 「リクエストを送る」タブ: 対象予約の上映回の座席マップを `/api/screenings/[id]/seats` から取得し、他人の確定済み座席をクリックしてリクエスト送信
  - 「届いたリクエスト」タブ: 自分の座席に届いた `PENDING` リクエストを承諾（別席へ移動 / 予約キャンセル）または拒否
  - 座席の所有権表示は「同一上映回にあるログインユーザーの全予約の座席」を自分の席として扱う（1ユーザーが同一上映回に複数予約を持つケースに対応。API側もユーザー単位で所有権を判定するため表示と揃えている）

## API

### `POST /api/seat-moves`
リクエスト送信。[`src/app/api/seat-moves/route.ts`](../src/app/api/seat-moves/route.ts)

- 認証必須（`getSessionUser`）
- body: `{ requesterBookingId, requesterBookingSeatId?, targetBookingSeatId }`
- `requesterBookingId` はログインユーザー自身の予約であること
- 依頼者・対象の予約は `CONFIRMED` であること
- 上映回の `startTime` が未来であること（上映開始後は `400`）
- `targetBookingSeatId` は同じ `screeningId` の座席で、所有者（`booking.userId`）が自分以外であること
- 同一 `(requesterBookingId, targetBookingSeatId)` に対する `PENDING` の重複リクエストは `409`
- 成功時は `SeatMoveRequest` を `status: 'PENDING'` で作成（`fee: 100`, `cashbackAmount: 100` で固定）

### `POST /api/seat-moves/[id]/respond`
承認・拒否。[`src/app/api/seat-moves/[id]/respond/route.ts`](../src/app/api/seat-moves/[id]/respond/route.ts)

- 認証必須。リクエストの `targetBooking.userId` が呼び出しユーザーと一致すること
- 依頼者・対象の予約は `CONFIRMED` であること
- 上映回の `startTime` が未来であること（上映開始後は `400`）
- body: `{ action: 'decline' | 'approve_reseat' | 'approve_cancel', newSeatId? }`
- `decline`: このリクエストを `DECLINED` にし、**同じリクエスター・同じ上映回の他の `PENDING` リクエストも自動で `CANCELLED`** にする（意図的な仕様。UIでも説明を表示）
- `approve_reseat`: リクエスター側に希望座席を付与し（提供席があれば `BookingSeat.seatId` を差し替え、なければ新規 `BookingSeat` を追加）、承諾側は `newSeatId` の空席に `BookingSeat.seatId` を変更。指定席が既に `CONFIRMED` ロック済みなら `Selected seat is already taken`（`409`）
- `approve_cancel`: リクエスター側に希望座席を付与した上で、承諾側の予約自体を `CANCELLED`（`ScreeningSeatLock` も削除）
- 承認処理は全体を `$transaction` で実行し、座席の付け替えと `ScreeningSeatLock` の更新を一致させる

### `GET /api/screenings/[id]/seats`（既存APIを拡張）
[`src/app/api/screenings/[id]/seats/route.ts`](../src/app/api/screenings/[id]/seats/route.ts)

- 各座席に `bookingSeatId` / `bookingId` を追加（キャンセルされていない予約に紐づく場合のみ）。フロントが「この座席をリクエストできるか」を判定するために使用

### `GET /api/bookings/[id]`（既存APIを拡張）
[`src/app/api/bookings/[id]/route.ts`](../src/app/api/bookings/[id]/route.ts)

- `requestedSeatMoves`（自分が送ったリクエスト）・`targetedSeatMoves`（自分宛のリクエスト）に、相手・自分の座席情報（`rowLabel`, `seatNumber`）を含めるよう `include` を拡張

## 型定義

[`src/lib/api/bookingTypes.ts`](../src/lib/api/bookingTypes.ts) に `SeatMoveRequestView` を追加し、`BookingView` に `requestedSeatMoves?` / `targetedSeatMoves?` を追加。

## 削除したもの

旧 `localStorage` ベースの実装を撤去。

- `src/app/reserve/seat-move/page.tsx`
- `src/lib/seatMoveData.ts`
- `src/lib/seatMoveStorage.ts`
- `src/components/ReserveFlow.tsx` 内の `saveBooking` 呼び出し（予約完了時に `localStorage` へ保存していた処理。新実装は予約データを直接DBから読むため不要）

## 既知の制約・今後の検討事項

- 決済・キャッシュバックは実処理を行わない（`fee` / `cashbackAmount` はDBに記録されるのみ）
- 同時に複数人が同じ空席へ承認しようとした場合はDB側の一意制約・再チェックで後勝ちがエラーになる（楽観的ロック的挙動。UIの座席一覧は取得時点のスナップショットなので、エラー時は再読み込みが必要）
- 通知機能（リクエスト受信のメール/プッシュ通知）は未実装
