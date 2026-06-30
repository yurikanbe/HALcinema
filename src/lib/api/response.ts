import { NextResponse } from 'next/server';

export function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item)),
  ) as T;
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(toJsonSafe(data), init);
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}
