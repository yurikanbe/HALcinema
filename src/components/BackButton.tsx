'use client';

interface BackButtonProps {
  label?: string;
  className?: string;
}

export default function BackButton({ label = '戻る', className }: BackButtonProps) {
  return (
    <button className={className} onClick={() => history.back()}>
      {label}
    </button>
  );
}
