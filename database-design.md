# HAL Cinema データベーステーブル設計

## テーブル一覧

| テーブル名              | 説明                              |
| ----------------------- | --------------------------------- |
| `users`                 | 会員情報                          |
| `movies`                | 映画情報                          |
| `creators`              | 監督・俳優                        |
| `movie_creators`        | 映画×クリエイター（中間テーブル） |
| `theaters`              | シアター（映画館）                |
| `screens`               | スクリーン                        |
| `seats`                 | 座席                              |
| `screenings`            | 上映スケジュール                  |
| `ticket_types`          | チケット種別・料金                |
| `bookings`              | 予約（購入）                      |
| `booking_seats`         | 予約座席明細                      |
| `seat_move_requests`    | 隣席リクエスト                    |
| `user_favorites`        | 推しクリエイター登録              |
| `notification_settings` | 通知設定                          |
| `news`                  | お知らせ・キャンペーン            |

---

## 各テーブル定義

### 1. `users` — 会員

| カラム名        | 型                      | 制約                         | 説明                        |
| --------------- | ----------------------- | ---------------------------- | --------------------------- |
| `id`            | BIGINT                  | PK, AUTO_INCREMENT           |                             |
| `member_id`     | VARCHAR(20)             | UNIQUE, NOT NULL             | 表示用ID (例: HAL-2024-001) |
| `email`         | VARCHAR(255)            | UNIQUE, NOT NULL             |                             |
| `password_hash` | VARCHAR(255)            | NOT NULL                     |                             |
| `name`          | VARCHAR(100)            | NOT NULL                     |                             |
| `tier`          | ENUM('standard','gold') | NOT NULL, DEFAULT 'standard' | 会員ランク                  |
| `visit_count`   | INT                     | NOT NULL, DEFAULT 0          | 来場回数                    |
| `created_at`    | DATETIME                | NOT NULL                     |                             |
| `updated_at`    | DATETIME                | NOT NULL                     |                             |

---

### 2. `movies` — 映画

| カラム名           | 型           | 制約                   | 説明                              |
| ------------------ | ------------ | ---------------------- | --------------------------------- |
| `id`               | BIGINT       | PK, AUTO_INCREMENT     |                                   |
| `slug`             | VARCHAR(100) | UNIQUE, NOT NULL       | URL用識別子 (例: thank-you-chuck) |
| `title_ja`         | VARCHAR(200) | NOT NULL               | 日本語タイトル                    |
| `title_en`         | VARCHAR(200) |                        | 英語タイトル                      |
| `genre`            | VARCHAR(50)  |                        | ジャンル (ミステリー, ドラマ等)   |
| `duration_minutes` | INT          | NOT NULL               | 上映時間                          |
| `description`      | TEXT         |                        | あらすじ                          |
| `poster_image_url` | VARCHAR(500) |                        | ポスター画像URL                   |
| `is_active`        | BOOLEAN      | NOT NULL, DEFAULT TRUE | 公開中フラグ                      |
| `release_date`     | DATE         |                        | 映画公開日                        |
| `created_at`       | DATETIME     | NOT NULL               |                                   |

---

### 3. `creators` — 監督・俳優（推し通知の対象）

| カラム名     | 型                              | 制約               | 説明 |
| ------------ | ------------------------------- | ------------------ | ---- |
| `id`         | BIGINT                          | PK, AUTO_INCREMENT |      |
| `name`       | VARCHAR(100)                    | NOT NULL           |      |
| `role`       | ENUM('director','actor','both') | NOT NULL           |      |
| `image_url`  | VARCHAR(500)                    |                    |      |
| `created_at` | DATETIME                        | NOT NULL           |      |

---

### 4. `movie_creators` — 映画×クリエイター（中間テーブル）

| カラム名         | 型                           | 制約             | 説明 |
| ---------------- | ---------------------------- | ---------------- | ---- |
| `movie_id`       | BIGINT                       | FK → movies.id   |      |
| `creator_id`     | BIGINT                       | FK → creators.id |      |
| `role`           | ENUM('director','actor')     | NOT NULL         |      |
| `character_name` | VARCHAR(100)                 |                  | 役名 |
| PRIMARY KEY      | (movie_id, creator_id, role) |                  |      |

---

### 5. `theaters` — シアター

| カラム名      | 型           | 制約               | 説明                   |
| ------------- | ------------ | ------------------ | ---------------------- |
| `id`          | BIGINT       | PK, AUTO_INCREMENT |                        |
| `name`        | VARCHAR(50)  | NOT NULL           | Starry / Abyss / Cyber |
| `description` | TEXT         |                    |                        |
| `image_url`   | VARCHAR(500) |                    |                        |
| `created_at`  | DATETIME     | NOT NULL           |                        |

---

### 6. `screens` — スクリーン

| カラム名            | 型          | 制約                       | 説明                        |
| ------------------- | ----------- | -------------------------- | --------------------------- |
| `id`                | BIGINT      | PK, AUTO_INCREMENT         |                             |
| `theater_id`        | BIGINT      | FK → theaters.id, NOT NULL |                             |
| `name`              | VARCHAR(50) | NOT NULL                   | スクリーン1, スクリーン2 等 |
| `seat_count`        | INT         | NOT NULL                   | 総座席数                    |
| `has_premium_seats` | BOOLEAN     | NOT NULL, DEFAULT FALSE    | プレミアム席ありか          |

---

### 7. `seats` — 座席

| カラム名        | 型                                  | 制約                         | 説明               |
| --------------- | ----------------------------------- | ---------------------------- | ------------------ |
| `id`            | BIGINT                              | PK, AUTO_INCREMENT           |                    |
| `screen_id`     | BIGINT                              | FK → screens.id, NOT NULL    |                    |
| `row_label`     | CHAR(2)                             | NOT NULL                     | 列記号 (A, B, C …) |
| `seat_number`   | INT                                 | NOT NULL                     | 番号               |
| `seat_type`     | ENUM('standard','premium')          | NOT NULL, DEFAULT 'standard' |                    |
| `is_accessible` | BOOLEAN                             | NOT NULL, DEFAULT FALSE      | 車椅子対応席       |
| UNIQUE          | (screen_id, row_label, seat_number) |                              |                    |

---

### 8. `screenings` — 上映スケジュール

| カラム名     | 型                                        | 制約                          | 説明               |
| ------------ | ----------------------------------------- | ----------------------------- | ------------------ |
| `id`         | BIGINT                                    | PK, AUTO_INCREMENT            |                    |
| `movie_id`   | BIGINT                                    | FK → movies.id, NOT NULL      |                    |
| `screen_id`  | BIGINT                                    | FK → screens.id, NOT NULL     |                    |
| `start_time` | DATETIME                                  | NOT NULL                      |                    |
| `end_time`   | DATETIME                                  | NOT NULL                      |                    |
| `format`     | ENUM('subtitled','dubbed','original')     | NOT NULL                      | 字幕 / 吹替 / 原語 |
| `status`     | ENUM('scheduled','cancelled','completed') | NOT NULL, DEFAULT 'scheduled' |                    |
| `created_at` | DATETIME                                  | NOT NULL                      |                    |

---

### 9. `ticket_types` — チケット種別・料金

| カラム名     | 型          | 制約                   | 説明                           |
| ------------ | ----------- | ---------------------- | ------------------------------ |
| `id`         | BIGINT      | PK, AUTO_INCREMENT     |                                |
| `name_ja`    | VARCHAR(50) | NOT NULL               | 一般, 大学生, 高校生以下, 小人 |
| `base_price` | INT         | NOT NULL               | 基本料金 (円)                  |
| `is_active`  | BOOLEAN     | NOT NULL, DEFAULT TRUE |                                |

---

### 10. `bookings` — 予約（購入）

| カラム名         | 型                                     | 制約                          | 説明           |
| ---------------- | -------------------------------------- | ----------------------------- | -------------- |
| `id`             | BIGINT                                 | PK, AUTO_INCREMENT            |                |
| `user_id`        | BIGINT                                 | FK → users.id, NOT NULL       |                |
| `screening_id`   | BIGINT                                 | FK → screenings.id, NOT NULL  |                |
| `booking_number` | VARCHAR(30)                            | UNIQUE, NOT NULL              | QRコード用番号 |
| `total_amount`   | INT                                    | NOT NULL                      | 合計金額 (円)  |
| `payment_method` | ENUM('credit_card','qr')               | NOT NULL                      |                |
| `payment_status` | ENUM('pending','completed','refunded') | NOT NULL, DEFAULT 'pending'   |                |
| `status`         | ENUM('confirmed','cancelled')          | NOT NULL, DEFAULT 'confirmed' |                |
| `created_at`     | DATETIME                               | NOT NULL                      |                |

---

### 11. `booking_seats` — 予約座席明細

| カラム名         | 型                    | 制約                           | 説明                                |
| ---------------- | --------------------- | ------------------------------ | ----------------------------------- |
| `id`             | BIGINT                | PK, AUTO_INCREMENT             |                                     |
| `booking_id`     | BIGINT                | FK → bookings.id, NOT NULL     |                                     |
| `seat_id`        | BIGINT                | FK → seats.id, NOT NULL        |                                     |
| `ticket_type_id` | BIGINT                | FK → ticket_types.id, NOT NULL |                                     |
| `unit_price`     | INT                   | NOT NULL                       | 実際の支払金額 (プレミアム料金含む) |
| UNIQUE           | (booking_id, seat_id) |                                | 同予約で同席は不可                  |

---

### 12. `seat_move_requests` — 隣席リクエスト

| カラム名                    | 型                                              | 制約                            | 説明                   |
| --------------------------- | ----------------------------------------------- | ------------------------------- | ---------------------- |
| `id`                        | BIGINT                                          | PK, AUTO_INCREMENT              |                        |
| `requester_booking_seat_id` | BIGINT                                          | FK → booking_seats.id, NOT NULL | リクエスト者の現在の席 |
| `target_booking_seat_id`    | BIGINT                                          | FK → booking_seats.id, NOT NULL | 移動希望先の席         |
| `fee`                       | INT                                             | NOT NULL, DEFAULT 100           | リクエスト料金 (+¥100) |
| `status`                    | ENUM('pending','approved','declined','expired') | NOT NULL, DEFAULT 'pending'     |                        |
| `requested_at`              | DATETIME                                        | NOT NULL                        |                        |
| `responded_at`              | DATETIME                                        |                                 | 承認/拒否の日時        |

---

### 13. `user_favorites` — 推しクリエイター登録

| カラム名     | 型                    | 制約                       | 説明 |
| ------------ | --------------------- | -------------------------- | ---- |
| `id`         | BIGINT                | PK, AUTO_INCREMENT         |      |
| `user_id`    | BIGINT                | FK → users.id, NOT NULL    |      |
| `creator_id` | BIGINT                | FK → creators.id, NOT NULL |      |
| `created_at` | DATETIME              | NOT NULL                   |      |
| UNIQUE       | (user_id, creator_id) |                            |      |

---

### 14. `notification_settings` — 通知設定

| カラム名                  | 型       | 制約                   | 説明               |
| ------------------------- | -------- | ---------------------- | ------------------ |
| `id`                      | BIGINT   | PK, AUTO_INCREMENT     |                    |
| `user_id`                 | BIGINT   | FK → users.id, UNIQUE  |                    |
| `push_enabled`            | BOOLEAN  | NOT NULL, DEFAULT TRUE | プッシュ通知全体   |
| `email_enabled`           | BOOLEAN  | NOT NULL, DEFAULT TRUE | メール通知全体     |
| `favorite_creator_notify` | BOOLEAN  | NOT NULL, DEFAULT TRUE | 推し出演作品通知   |
| `booking_remind_notify`   | BOOLEAN  | NOT NULL, DEFAULT TRUE | 鑑賞前リマインダー |
| `campaign_notify`         | BOOLEAN  | NOT NULL, DEFAULT TRUE | キャンペーン通知   |
| `seat_move_notify`        | BOOLEAN  | NOT NULL, DEFAULT TRUE | 隣席リクエスト通知 |
| `updated_at`              | DATETIME | NOT NULL               |                    |

---

### 15. `news` — お知らせ・キャンペーン

| カラム名        | 型                                      | 制約                    | 説明                               |
| --------------- | --------------------------------------- | ----------------------- | ---------------------------------- |
| `id`            | BIGINT                                  | PK, AUTO_INCREMENT      |                                    |
| `title`         | VARCHAR(300)                            | NOT NULL                |                                    |
| `body`          | TEXT                                    |                         | 本文                               |
| `category`      | ENUM('campaign','event','announcement') | NOT NULL                | キャンペーン / イベント / お知らせ |
| `thumbnail_url` | VARCHAR(500)                            |                         |                                    |
| `is_featured`   | BOOLEAN                                 | NOT NULL, DEFAULT FALSE | トップ掲載フラグ                   |
| `published_at`  | DATETIME                                |                         | 公開日時 (NULLは未公開)            |
| `created_at`    | DATETIME                                | NOT NULL                |                                    |

---

## ER図（主要な関連）

```
users ──── bookings ──── booking_seats ──── seats ──── screens ──── theaters
  │              └──────── screenings ──── movies
  │                              └──────── screens
  │
  ├── user_favorites ──── creators ──── movie_creators ──── movies
  └── notification_settings

booking_seats ←── seat_move_requests ──→ booking_seats
```

---

## 設計ポイント

| 項目               | 判断内容                                                                                                                                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **隣席リクエスト** | `seat_move_requests` を独立テーブルに。リクエスト元・対象ともに `booking_seats.id` で参照し、誰がどの席を狙っているか追跡可能                           |
| **プレミアム料金** | `ticket_types.base_price` + 席種別の加算は `booking_seats.unit_price` に実額を保存。価格改定後も履歴が正確に残る                                        |
| **推し通知**       | `creators` テーブルで監督・俳優を管理し、`movie_creators` で紐付け。`user_favorites` と組み合わせて上映スケジュール追加時に通知対象ユーザーを特定できる |
| **座席の一意性**   | `booking_seats` に `(booking_id, seat_id)` のUNIQUE制約。さらに同じ `screening_id` での二重予約はアプリ層または複合UNIQUE制約で防ぐ必要あり             |
