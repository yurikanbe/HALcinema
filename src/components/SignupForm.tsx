'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import BackButton from '@/components/BackButton';
import shared from '@/styles/shared.module.css';
import s from './LoginForm.module.css';

interface SignupApiResponse {
  ok?: boolean;
  error?: string;
}

export default function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください。');
      return;
    }
    if (password !== passwordConfirm) {
      setError('パスワードが一致しません。');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await res.json()) as SignupApiResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? '会員登録に失敗しました。');
      }

      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        throw new Error('登録は完了しましたが、自動ログインに失敗しました。ログイン画面からお試しください。');
      }

      router.push('/mypage');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : '会員登録に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={s.formWrap}>
      <div className={s.backRow}>
        <BackButton className={s.backBtn} />
      </div>

      <form className={s.form} onSubmit={handleSubmit}>
        {error && <div className={s.error}>{error}</div>}

        <label className={s.field}>
          <span>氏名</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </label>

        <label className={s.field}>
          <span>メールアドレス</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className={s.field}>
          <span>パスワード（8文字以上）</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label className={s.field}>
          <span>パスワード（確認）</span>
          <input
            type="password"
            required
            minLength={8}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <button type="submit" className={`${shared.btn} ${shared.btnSolid}`} disabled={isSubmitting}>
          {isSubmitting ? '登録中' : '会員登録する'}
        </button>

        <p className={s.switchLink}>
          すでに会員の方は <Link href="/login">ログイン</Link>
        </p>
      </form>
    </div>
  );
}
