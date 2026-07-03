'use client';

import { useEffect, useState } from 'react';
import s from './NotificationToggles.module.css';

interface Settings {
  remind: boolean;
  campaign: boolean;
}

const DEFAULT_SETTINGS: Settings = { remind: true, campaign: true };
const STORAGE_KEY = 'hal_notify_settings';

const ITEMS: { key: keyof Settings; title: string; desc: string }[] = [
  { key: 'remind', title: '上映開始リマインド', desc: '当日の開場・上映開始前に通知します' },
  { key: 'campaign', title: 'キャンペーン情報', desc: '限定特典やキャンペーンのお知らせ' },
];

export default function NotificationToggles() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch {
      // ignore malformed local storage data
    }
  }, []);

  const toggle = (key: keyof Settings) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className={s.panel}>
      <div className={s.grid}>
        {ITEMS.map((item) => (
          <div key={item.key} className={s.card}>
            <div>
              <div className={s.title}>{item.title}</div>
              <div className={s.desc}>{item.desc}</div>
            </div>
            <label className={s.toggle}>
              <input
                type="checkbox"
                checked={settings[item.key]}
                onChange={() => toggle(item.key)}
                className={s.toggleInput}
              />
              <span className={s.toggleTrack}>
                <span className={s.toggleThumb} />
              </span>
              <span className={s.toggleText}>通知を受け取る</span>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
