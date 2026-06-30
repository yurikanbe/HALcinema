import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { assertSignupPayload, createMemberId } from '@/lib/api/authPayload';
import { jsonError, jsonOk } from '@/lib/api/response';

export async function POST(request: Request) {
  let payload;

  try {
    payload = assertSignupPayload(await request.json());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Invalid request body', 400);
  }

  try {
    const passwordHash = await bcrypt.hash(payload.password, 10);

    await prisma.user.create({
      data: {
        memberId: createMemberId(),
        email: payload.email,
        passwordHash,
        name: payload.name,
        role: 'MEMBER',
      },
    });

    return jsonOk({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return jsonError('This email is already registered', 409);
    }
    return jsonError(error instanceof Error ? error.message : 'Failed to sign up', 400);
  }
}
