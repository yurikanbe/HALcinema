import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createMemberId } from '@/lib/api/authPayload';
import { DEV_DEMO_ACCOUNTS, DEV_DEMO_PASSWORD } from '@/lib/devTools';

/**
 * デモユーザーを用意する。
 * GET のたびに bcrypt.hash すると /api/dev/lab が遅く、ログインと競合しやすい。
 * パスワード再設定は resetPassword: true（POST）のときだけ行う。
 */
export async function ensureDemoUsers(
  client: PrismaClient = prisma,
  options: { resetPassword?: boolean } = {},
) {
  for (const account of DEV_DEMO_ACCOUNTS) {
    const existing = await client.user.findUnique({
      where: { email: account.email },
      select: { id: true, passwordHash: true },
    });

    const shouldSetPassword = options.resetPassword || !existing?.passwordHash;
    const passwordHash = shouldSetPassword
      ? await bcrypt.hash(DEV_DEMO_PASSWORD, 10)
      : undefined;

    if (!existing) {
      await client.user.create({
        data: {
          memberId: createMemberId(),
          email: account.email,
          passwordHash: passwordHash!,
          name: account.name,
          role: account.role,
        },
      });
      continue;
    }

    await client.user.update({
      where: { id: existing.id },
      data: {
        name: account.name,
        role: account.role,
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
  }
}
