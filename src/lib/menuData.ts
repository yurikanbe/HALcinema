export interface MenuItem {
  id: string;
  title: string;
  tag: string;
  src: string;
  desc: string;
}

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'popcorn', title: 'ポップコーン', tag: 'Snack', src: '/images/menu/popcorn.png',
    desc: '王道の塩から塩バター、キャラメル、塩キャラメル、\n\nミックスまで、選べる組み合わせが豊富。\n\nお子様やおひとりさま向けの小さいサイズも\n\nご用意しています。',
  },
  {
    id: 'drink', title: 'ドリンク', tag: 'Drink', src: '/images/menu/drink.png',
    desc: 'コーラやレモンスカッシュなどのアイスドリンク、\n\nホットコーヒーやラテまで種類が豊富。\n\nさらに星空をイメージした「Stella Horizon」と\n\n深海の「Deep Sea Melody」の\n\nオリジナルドリンクもご用意しています。',
  },
  {
    id: 'food', title: 'フード', tag: 'Food', src: '/images/menu/food.png',
    desc: '種類豊富なラインナップ。\n\n食べ比べたり、シェアしたり、\n\nそのときの気分に合わせて楽しめる。\n\n小腹を満たすサイズ展開もそろっています。',
  },
  {
    id: 'sweets', title: 'スイーツ', tag: 'Sweets', src: '/images/menu/sweets.png',
    desc: 'チュロス、クレープ、アイス＆ソフトなど、\n\n映画時間にぴったりの甘いメニューが勢ぞろい。\n\n星空を閉じ込めた「星空シアターパルフェ」と\n\n深海のきらめきを映した「深海のパールサンデー」の\n\nオリジナルスイーツもお楽しみいただけます。',
  },
  {
    id: 'set', title: 'お得なセット', tag: 'Recommended', src: '/images/menu/set.png',
    desc: 'ポップコーンセット、ホットドッグセット、\n\nナチョスセット、スイーツセットまで、\n\nお好きなメニューとドリンクを組み合わせた\n\nセットをご用意。\n\n手軽に楽しめる定番から、\n\nシアターオリジナルのスペシャルセットまで。',
  },
];
