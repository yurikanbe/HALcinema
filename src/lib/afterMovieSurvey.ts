export const AFTER_MOVIE_SURVEY = [
  {
    id: 'enjoyment',
    question: '本日の映画はいかがでしたか？',
    options: ['とても良かった', '良かった', '普通', 'あまり良くなかった'],
  },
  {
    id: 'genre',
    question: '次に観たいジャンルは？',
    options: ['アクション', 'ドラマ', 'コメディ', 'ホラー / SF', 'アニメ'],
  },
  {
    id: 'stay',
    question: 'このあと館内に滞在する予定はありますか？',
    options: ['もう1本観たい', 'フードを楽しみたい', 'すぐ帰る', '未定'],
  },
] as const;

export type AfterMovieSurveyAnswers = Record<string, string>;
