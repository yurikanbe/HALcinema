import bcrypt from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createMemberId } from '@/lib/api/authPayload';
import { DEV_DEMO_ACCOUNTS, DEV_DEMO_PASSWORD } from '@/lib/devTools';

export async function ensureDemoUsers(client: PrismaClient = prisma) {
  const passwordHash = await bcrypt.hash(DEV_DEMO_PASSWORD, 10);

  for (const account of DEV_DEMO_ACCOUNTS) {
    await client.user.upsert({
      where: { email: account.email },
      create: {
        memberId: createMemberId(),
        email: account.email,
        passwordHash,
        name: account.name,
        role: account.role,
      },
      update: {
        name: account.name,
        role: account.role,
        passwordHash,
      },
    });
  }
}
