import { auth } from '@/lib/auth';

export interface SessionUser {
  id: string;
  role: string;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return { id: session.user.id, role: session.user.role };
}
