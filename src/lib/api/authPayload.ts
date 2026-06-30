export interface SignupPayload {
  name?: string;
  email?: string;
  password?: string;
}

export function assertSignupPayload(value: unknown): Required<SignupPayload> {
  if (!value || typeof value !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const payload = value as SignupPayload;
  const name = payload.name?.trim();
  const email = payload.email?.trim().toLowerCase();
  const password = payload.password;

  if (!name) throw new Error('name is required');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('a valid email is required');
  }
  if (!password || password.length < 8) {
    throw new Error('password must be at least 8 characters');
  }

  return { name, email, password };
}

export function createMemberId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().replaceAll('-', '').slice(0, 4).toUpperCase();
  return `M${timestamp}${random}`.slice(0, 20);
}
