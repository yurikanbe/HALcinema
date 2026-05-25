import shared from '@/styles/shared.module.css';

export const CATEGORY_LABEL: Record<string, string> = {
  campaign: 'キャンペーン',
  event:    'イベント',
  info:     'お知らせ',
};

export const BADGE_CLASS: Record<string, string> = {
  campaign: shared.newsBadgeCampaign,
  event:    shared.newsBadgeEvent,
  info:     shared.newsBadgeInfo,
};
