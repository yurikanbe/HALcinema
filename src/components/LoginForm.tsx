'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import BackButton from '@/components/BackButton';
import shared from '@/styles/shared.module.css';
import s from './LoginForm.module.css';

interface LoginFormProps {
  callbackUrl?: string;
}

export default function LoginForm({ callbackUrl }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('メールアドレスまたはパスワードが正しくありません。');
        return;
      }

      router.push(callbackUrl ?? '/mypage');
      router.refresh();
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
          <span>パスワード</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button type="submit" className={`${shared.btn} ${shared.btnSolid}`} disabled={isSubmitting}>
          {isSubmitting ? 'ログイン中' : 'ログイン'}
        </button>

        <p className={s.switchLink}>
          会員登録がまだの方は <Link href="/signup">こちら</Link>
        </p>
      </form>
    </div>
  );
}
