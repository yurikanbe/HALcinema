# HAL Cinema データベーステーブル設計

## テーブル一覧

| テーブル名 | 説明 |
|---|---|
| `users` | 会員情報 |
| `movies` | 映画情報 |
| `creators` | 監督・俳優 |
| `movie_creators` | 映画×クリエイター（中間テーブル） |
| `theaters` | 館（会場）— HAL Cinema 全体の情報（1館のみ） |
| `screens` | スクリーン — 館内の上映室。スクリーンごとにコンセプトが異なる |
| `seats` | 座席 |
| `screenings` | 上映スケジュール |
| `ticket_types` | チケット種別・料金 |
| `bookings` | 予約（購入） |
| `booking_seats` | 予約座席明細 |
| `seat_move_requests` | 隣席リクエスト |
| `user_favorites` | 推しクリエイター登録 |
| `notification_settings` | 通知設定 |
| `news` | お知らせ・キャンペーン |

---

## 各テーブル定義

### 1. `users` — 会員

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `member_id` | VARCHAR(20) | UNIQUE, NOT NULL | 表示用ID (例: HAL-2024-001) |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | |
| `password_hash` | VARCHAR(255) | NOT NULL | |
| `name` | VARCHAR(100) | NOT NULL | |
| `created_at` | DATETIME | NOT NULL | |
| `updated_at` | DATETIME | NOT NULL | |

---

### 2. `movies` — 映画

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `slug` | VARCHAR(100) | UNIQUE, NOT NULL | URL用識別子 (例: thank-you-chuck) |
| `title_ja` | VARCHAR(200) | NOT NULL | 日本語タイトル |
| `title_en` | VARCHAR(200) | | 英語タイトル |
| `genre` | VARCHAR(50) | | ジャンル (ミステリー, ドラマ等) |
| `duration_minutes` | INT | NOT NULL | 上映時間 |
| `description` | TEXT | | あらすじ |
| `poster_image_url` | VARCHAR(500) | | ポスター画像URL |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | 公開中フラグ |
| `release_date` | DATE | | |
| `created_at` | DATETIME | NOT NULL | |

---

### 3. `creators` — 監督・俳優（推し通知の対象）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(100) | NOT NULL | |
| `role` | ENUM('director','actor','both') | NOT NULL | |
| `image_url` | VARCHAR(500) | | |
| `created_at` | DATETIME | NOT NULL | |

---

### 4. `movie_creators` — 映画×クリエイター（中間テーブル）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `movie_id` | BIGINT | FK → movies.id | |
| `creator_id` | BIGINT | FK → creators.id | |
| `role` | ENUM('director','actor') | NOT NULL | |
| `character_name` | VARCHAR(100) | | 役名 |
| PRIMARY KEY | (movie_id, creator_id, role) | | |

---

### 5. `theaters` — 館（会場）

HAL Cinema は物理的な館が1つのみ。館全体の名称・紹介文・画像などを管理する。

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `name` | VARCHAR(50) | NOT NULL | 館名 (例: HAL Cinema) |
| `description` | TEXT | | 館全体の紹介文 |
| `image_url` | VARCHAR(500) | | 館の代表画像 |
| `created_at` | DATETIME | NOT NULL | |

---

### 6. `screens` — スクリーン

館内の上映室。スクリーン番号ごとにコンセプト（世界観）が異なる。

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `screen_number` | INT | UNIQUE, NOT NULL | スクリーン番号 (1, 2, 3 …) |
| `concept_name` | VARCHAR(50) | NOT NULL | コンセプト名 (Starry / Abyss / Cyber 等) |
| `description` | TEXT | | コンセプトの説明文 |
| `image_url` | VARCHAR(500) | | コンセプト紹介用画像 |
| `seat_count` | INT | NOT NULL | 総座席数 |

---

### 7. `seats` — 座席

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `screen_id` | BIGINT | FK → screens.id, NOT NULL | |
| `row_label` | CHAR(2) | NOT NULL | 列記号 (A, B, C …) |
| `seat_number` | INT | NOT NULL | 番号 |
| `is_accessible` | BOOLEAN | NOT NULL, DEFAULT FALSE | 車椅子対応席 |
| UNIQUE | (screen_id, row_label, seat_number) | | |

---

### 8. `screenings` — 上映スケジュール

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `movie_id` | BIGINT | FK → movies.id, NOT NULL | |
| `screen_id` | BIGINT | FK → screens.id, NOT NULL | |
| `start_time` | DATETIME | NOT NULL | |
| `end_time` | DATETIME | NOT NULL | |
| `format` | ENUM('subtitled','dubbed','original') | NOT NULL | 字幕 / 吹替 / 原語 |
| `status` | ENUM('scheduled','cancelled','completed') | NOT NULL, DEFAULT 'scheduled' | |
| `created_at` | DATETIME | NOT NULL | |

---

### 9. `ticket_types` — チケット種別・料金

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `name_ja` | VARCHAR(50) | NOT NULL | 一般, 大学生, 高校生以下, 小人 |
| `base_price` | INT | NOT NULL | 基本料金 (円) |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | |

---

### 10. `bookings` — 予約（購入）

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `user_id` | BIGINT | FK → users.id, NOT NULL | |
| `screening_id` | BIGINT | FK → screenings.id, NOT NULL | |
| `booking_number` | VARCHAR(30) | UNIQUE, NOT NULL | QRコード用番号 |
| `total_amount` | INT | NOT NULL | 合計金額 (円) |
| `payment_method` | ENUM('credit_card','qr') | NOT NULL | |
| `payment_status` | ENUM('pending','completed','refunded') | NOT NULL, DEFAULT 'pending' | |
| `status` | ENUM('confirmed','cancelled') | NOT NULL, DEFAULT 'confirmed' | |
| `created_at` | DATETIME | NOT NULL | |

---

### 11. `booking_seats` — 予約座席明細

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `booking_id` | BIGINT | FK → bookings.id, NOT NULL | |
| `seat_id` | BIGINT | FK → seats.id, NOT NULL | |
| `ticket_type_id` | BIGINT | FK → ticket_types.id, NOT NULL | |
| `unit_price` | INT | NOT NULL | 実際の支払金額 |
| UNIQUE | (booking_id, seat_id) | | 同予約で同席は不可 |

---

### 12. `seat_move_requests` — 隣席リクエスト

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `requester_booking_seat_id` | BIGINT | FK → booking_seats.id, NOT NULL | リクエスト者の現在の席 |
| `target_booking_seat_id` | BIGINT | FK → booking_seats.id, NOT NULL | 移動希望先の席 |
| `fee` | INT | NOT NULL, DEFAULT 100 | リクエスト料金 (+¥100) |
| `cashback_amount` | INT | NOT NULL | 承認者へのキャッシュバック |
| `status` | ENUM('pending','approved','declined','expired') | NOT NULL, DEFAULT 'pending' | |
| `requested_at` | DATETIME | NOT NULL | |
| `responded_at` | DATETIME | | 承認/拒否の日時 |

---

### 13. `user_favorites` — 推しクリエイター登録

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `user_id` | BIGINT | FK → users.id, NOT NULL | |
| `creator_id` | BIGINT | FK → creators.id, NOT NULL | |
| `created_at` | DATETIME | NOT NULL | |
| UNIQUE | (user_id, creator_id) | | |

---

### 14. `notification_settings` — 通知設定

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `user_id` | BIGINT | FK → users.id, UNIQUE | |
| `push_enabled` | BOOLEAN | NOT NULL, DEFAULT TRUE | プッシュ通知全体 |
| `email_enabled` | BOOLEAN | NOT NULL, DEFAULT TRUE | メール通知全体 |
| `favorite_creator_notify` | BOOLEAN | NOT NULL, DEFAULT TRUE | 推し出演作品通知 |
| `booking_remind_notify` | BOOLEAN | NOT NULL, DEFAULT TRUE | 鑑賞前リマインダー |
| `campaign_notify` | BOOLEAN | NOT NULL, DEFAULT TRUE | キャンペーン通知 |
| `seat_move_notify` | BOOLEAN | NOT NULL, DEFAULT TRUE | 隣席リクエスト通知 |
| `updated_at` | DATETIME | NOT NULL | |

---

### 15. `news` — お知らせ・キャンペーン

| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| `id` | BIGINT | PK, AUTO_INCREMENT | |
| `title` | VARCHAR(300) | NOT NULL | |
| `body` | TEXT | | 本文 |
| `category` | ENUM('campaign','event','announcement') | NOT NULL | キャンペーン / イベント / お知らせ |
| `thumbnail_url` | VARCHAR(500) | | |
| `is_featured` | BOOLEAN | NOT NULL, DEFAULT FALSE | トップ掲載フラグ |
| `published_at` | DATETIME | | 公開日時 (NULLは未公開) |
| `created_at` | DATETIME | NOT NULL | |

---

## ER図（主要な関連）

```
theaters (館1件)          screens (スクリーン番号 × コンセプト)
                              │
users ──── bookings ──── booking_seats ──── seats
  │              └──────── screenings ──── movies
  │                              └──────── screens
  │
  ├── user_favorites ──── creators ──── movie_creators ──── movies
  └── notification_settings

booking_seats ←── seat_move_requests ──→ booking_seats
```

---

## 設計ポイント

| 項目 | 判断内容 |
|---|---|
| **館とスクリーン** | 物理的な館は `theaters` に1件のみ登録。Starry / Abyss / Cyber 等の世界観は `screens.concept_name` で管理し、スクリーン番号 (`screen_number`) とセットで識別する |
| **隣席リクエスト** | `seat_move_requests` を独立テーブルに。リクエスト元・対象ともに `booking_seats.id` で参照し、誰がどの席を狙っているか追跡可能 |
| **推し通知** | `creators` テーブルで監督・俳優を管理し、`movie_creators` で紐付け。`user_favorites` と組み合わせて上映スケジュール追加時に通知対象ユーザーを特定できる |
| **座席の一意性** | `booking_seats` に `(booking_id, seat_id)` のUNIQUE制約。さらに同じ `screening_id` での二重予約はアプリ層または複合UNIQUE制約で防ぐ必要あり |
