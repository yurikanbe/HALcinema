# HAL Cinema 会員ログイン・予約確認画面 要件定義書（ドラフト）

## 1. 背景・目的

予約機能（`reservation-requirements.md`）の実装により座席予約・決済までは完了したが、ユーザーが自分の予約内容を後から確認する画面が存在しない。

会員・ゲストの両方が予約内容を確認できるようにする。会員の場合はクライアントから送られた `userId` を信用するとなりすましが可能になるため、本物の認証基盤（NextAuth v5 + Credentials + Prisma Adapter）を先に実装し、サーバー側でセッションから安全に `userId` を導出できるようにする。

あわせて、ゲスト予約照会についても現状の `GET /api/bookings?guestEmail=...` がメールアドレスだけでその人の全予約を返してしまうセキュリティ上の穴があるため、予約番号＋メールアドレス両方一致を要求する専用エンドポイントに直す。

## 2. 対象範囲

### 対象に含める

- メールアドレス・パスワードによる会員登録（サインアップ）
- メールアドレス・パスワードによるログイン／ログアウト
- ログイン状態のNavへの反映（ログイン/マイページリンクの出し分け）
- 会員のマイページ（自分の予約一覧表示）
- ゲストの予約照会（予約番号＋メールアドレスでの検索）
- 予約作成時、ログイン中は会員予約（`MEMBER`）としてサーバー側で安全に紐付け
- ゲスト予約時の入力欄（氏名・メール）を実入力に対応させる（現状はデモ固定値）

### 今回の初期実装から外す

- OAuthプロバイダ連携（Google等）
- パスワードリセット・メール認証フロー（`resend`連携は将来対応、`guestLookupTokenHash`関連カラムは今回未使用のまま）
- セッションの即時失効・複数デバイス管理
- 管理者(ADMIN)向け画面

## 3. 前提・設計判断

- **Prisma Adapter (`@auth/prisma-adapter`) を使用する。** 公式アダプタは `User.id` が `String` であることを前提とするため、`User.id` を `BigInt @id @default(autoincrement())` から `String @id @default(cuid())` に変更する。
  - 現状 `users` テーブルは0件、`bookings` は2件（共に `userId` NULL）であり、型変更によるデータ損失リスクはない。
  - `Booking.userId` / `ScreeningSeatLock.userId` / `UserFavorite.userId` / `NotificationSetting.userId` の4箇所がFKとして連動し `BigInt` → `String` に変わる。
- **セッション戦略はJWTを維持する**（`session: { strategy: 'jwt' }`）。Adapterは User/Account の永続化に使うが、Credentials provider + databaseセッションは未成熟なため。Session/VerificationTokenテーブルは将来のOAuth対応に備えて用意するが、当面ほぼ未使用となる。
- ゲスト照会は**予約番号＋メールアドレス両方の一致を必須**とする専用エンドポイントを新設する。既存の `GET /api/bookings` はログイン済みユーザー専用（セッション由来の `userId` のみ）に寄せる。
- パスワードハッシュ化は `bcryptjs`（ネイティブビルド不要）を使用する。

## 4. 機能要件

### 4.1 会員登録（サインアップ）

- 入力項目: 氏名・メールアドレス・パスワード・パスワード確認
- メールアドレスは一意。重複時は409エラー。
- パスワードは `bcrypt.hash` でハッシュ化し `users.password_hash` に保存する。
- 会員ID（`memberId`）はサーバー側で自動生成する（予約番号生成と同様のパターン）。
- 登録成功後は自動ログインし、マイページへ遷移する。

### 4.2 ログイン／ログアウト

- NextAuth v5 の Credentials Provider を使用し、メールアドレス＋パスワードで認証する。
- 認証成功時、JWTセッションに `id`（cuid文字列）・`role` を含める。
- ログインページは `/login`、ログイン失敗時はフォーム内にエラーメッセージを表示する（具体的にどちらが誤りかは出さない）。
- Navにログイン状態を反映する。ログイン中は「マイページ」リンク＋氏名＋ログアウトボタン、未ログイン時は「ログイン」リンクを表示する。

### 4.3 会員のマイページ（予約一覧）

- ログイン中のユーザーは `/mypage` で自分の予約一覧を確認できる。
- 一覧はサーバー側でセッションから取得した `userId` を用いてPrismaから直接取得する（クライアント入力は信用しない）。
- 表示項目: 作品名、上映日時、スクリーン、座席、合計金額、予約ステータス、決済ステータス。

### 4.4 ゲストの予約照会

- 未ログイン状態で `/mypage` を開くと、予約番号＋メールアドレスを入力する照会フォームを表示する。
- サーバー側は両方が完全一致した予約のみを返す。
- 一致しない場合は「予約が見つかりませんでした」という共通メッセージのみを返し、どちらの項目が誤りかは漏らさない。

### 4.5 予約作成時の会員紐付け

- ログイン中に `POST /api/bookings` を呼ぶ場合、サーバーはセッションから `userId` を強制的に決定し、リクエストボディの `userId`／`bookingType` は無視する。
- 未ログイン時は従来通りゲスト予約（`guestName`／`guestEmail` 必須）を維持する。
- 予約フロー（`ReserveFlow.tsx`）のゲスト入力欄は、デモ固定値（「デモ予約」「demo@example.com」）を廃止し、実際にユーザーが入力した氏名・メールアドレスを送信する。

## 5. データベース変更

### 5.1 `User` モデル

- `id`: `BigInt @id @default(autoincrement())` → `String @id @default(cuid())`
- 追加: `emailVerified DateTime? @map("email_verified")`
- 追加リレーション: `accounts Account[]`, `sessions Session[]`

### 5.2 新規モデル（Auth.js Prisma Adapter 標準スキーマ準拠）

- `Account`（OAuth用、将来対応のため用意。今回はCredentialsのみで実質未使用）
- `Session`
- `VerificationToken`

### 5.3 既存モデルの `userId` 型変更

| モデル | 変更前 | 変更後 |
|---|---|---|
| `Booking.userId` | `BigInt?` | `String?` |
| `ScreeningSeatLock.userId` | `BigInt?` | `String?` |
| `UserFavorite.userId` | `BigInt` | `String` |
| `NotificationSetting.userId` | `BigInt @unique` | `String @unique` |

カラム名・`@map` 指定は変更しない。マイグレーションは新規追加とし、既存マイグレーション `20260623073410_reservation_schema` は変更しない。

## 6. API要件

### 6.1 認証関連

- `GET/POST /api/auth/[...nextauth]` — NextAuthハンドラ（`src/lib/auth.ts` の `handlers` を再export）
- `POST /api/auth/signup` — 会員登録。body: `{ name, email, password }`。成功時 `{ ok: true }`、パスワードハッシュは返さない。

### 6.2 予約関連（変更）

- `GET /api/bookings` — セッションがあれば `session.user.id` で絞り込み。セッションがなければ `guestEmail` 単体での絞り込みは廃止し、未認証アクセスは原則ゲスト照会専用エンドポイントへ誘導する。
- `POST /api/bookings` — セッションがあれば `bookingType: 'MEMBER'`・`userId` をサーバー側で強制。クライアント由来の `userId`／`bookingType` は無視する。

### 6.3 ゲスト照会（新規）

- `POST /api/guest-bookings/lookup` — body: `{ bookingNumber, guestEmail }`（両方必須）。完全一致する予約のみ返す。一致しない場合は404＋共通エラーメッセージ。

## 7. 画面要件

| パス | 種別 | 概要 |
|---|---|---|
| `/login` | 新規 | ログインフォーム |
| `/signup` | 新規 | サインアップフォーム |
| `/mypage` | 新規 | ログイン中: 予約一覧 / 未ログイン: ゲスト照会フォーム |

Navには「ログイン」または「マイページ」リンクをログイン状態に応じて出し分ける。

## 8. 未決定事項・今後の課題

- パスワードリセット・メール認証フロー（`resend`連携、`guestLookupTokenHash`の活用）は別途設計する。
- セッションの即時失効（強制ログアウト）が必要になった場合は `tokenVersion` 等の追加実装を検討する。
- 予約詳細の個別ページ（`/mypage/[id]`等）が必要かは利用状況を見て判断する。
