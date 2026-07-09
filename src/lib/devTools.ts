import type { UserRole } from '@prisma/client';

/** 開発・発表デモ用の共通パスワード（本番では無効） */
export const DEV_DEMO_PASSWORD = 'demo1234';

export interface DevDemoAccount {
  email: string;
  name: string;
  role: UserRole;
  hint: string;
}

export const DEV_DEMO_ACCOUNTS: DevDemoAccount[] = [
  {
    email: 'demo-a@halcinema.test',
    name: 'デモユーザーA',
    role: 'MEMBER',
    hint: '先約者 — 通常予約して席を確定させる',
  },
  {
    email: 'demo-b@halcinema.test',
    name: 'デモユーザーB',
    role: 'MEMBER',
    hint: '依頼者 — 予約フローから譲渡リクエストを送る',
  },
  {
    email: 'demo-admin@halcinema.test',
    name: 'デモ管理者',
    role: 'ADMIN',
    hint: '管理者ロール（将来の管理機能用）',
  },
];

export function isDevToolsEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.ENABLE_DEV_TOOLS === 'true';
}
