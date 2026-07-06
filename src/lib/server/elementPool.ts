import type { ElementKind, GameElement } from '$lib/types';

const pool: Array<Omit<GameElement, 'id'>> = [
  { label: 'ねこ', kind: 'character' },
  { label: 'いぬ', kind: 'character' },
  { label: 'うさぎ', kind: 'character' },
  { label: 'サメ', kind: 'character' },
  { label: 'ペンギン', kind: 'character' },
  { label: 'ロボ', kind: 'character' },
  { label: 'にんじゃ', kind: 'character' },
  { label: 'おばけ', kind: 'character' },
  { label: 'ドラゴン', kind: 'character' },
  { label: 'まほうつかい', kind: 'character' },
  { label: '星', kind: 'item' },
  { label: 'かぎ', kind: 'item' },
  { label: 'コイン', kind: 'item' },
  { label: 'りんご', kind: 'item' },
  { label: 'ボール', kind: 'item' },
  { label: 'つばさ', kind: 'item' },
  { label: 'くつ', kind: 'item' },
  { label: 'スコップ', kind: 'item' },
  { label: 'ふうせん', kind: 'item' },
  { label: 'キャンディ', kind: 'item' },
  { label: 'うみ', kind: 'place' },
  { label: 'そら', kind: 'place' },
  { label: 'もり', kind: 'place' },
  { label: 'おしろ', kind: 'place' },
  { label: 'こうえん', kind: 'place' },
  { label: 'どうくつ', kind: 'place' },
  { label: 'ゆき山', kind: 'place' },
  { label: 'うちゅう', kind: 'place' },
  { label: 'おまつり', kind: 'place' },
  { label: 'プール', kind: 'place' },
  { label: 'めいろ', kind: 'place' },
  { label: 'キッチン', kind: 'place' },
  { label: 'ジャンプ', kind: 'rule' },
  { label: 'ダッシュ', kind: 'rule' },
  { label: 'すべる', kind: 'rule' },
  { label: 'かくれる', kind: 'rule' },
  { label: 'あつめる', kind: 'rule' },
  { label: 'にげる', kind: 'rule' },
  { label: 'まもる', kind: 'rule' },
  { label: 'ワープ', kind: 'rule' },
  { label: 'タイマー', kind: 'rule' },
  { label: 'さかさま', kind: 'rule' },
  { label: 'わくわく', kind: 'mood' },
  { label: 'ふわふわ', kind: 'mood' },
  { label: 'キラキラ', kind: 'mood' },
  { label: 'かみなり', kind: 'obstacle' },
  { label: 'トゲ', kind: 'obstacle' },
  { label: 'あな', kind: 'obstacle' },
  { label: 'かぜ', kind: 'obstacle' },
  { label: 'ブロック', kind: 'obstacle' }
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed: string): () => number {
  let state = hash(seed || `${Date.now()}`) || 1;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function keywordHints(keyword: string): Array<Omit<GameElement, 'id'>> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];
  return [
    { label: trimmed, kind: 'character' },
    { label: `${trimmed}あつめ`, kind: 'rule' }
  ];
}

export function getRandomElements(keyword: string, count = 12): GameElement[] {
  const rng = createRng(`${keyword}:${Date.now()}:${Math.random()}`);
  const expanded = [...keywordHints(keyword), ...pool];
  const shuffled = expanded
    .map((item, index) => ({ item, score: rng() + index * 0.00001 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, count);

  return shuffled.map(({ item }, index) => ({
    ...item,
    id: `${item.kind}-${hash(`${keyword}-${item.label}-${index}`)}`
  }));
}

export const elementKindLabel: Record<ElementKind, string> = {
  character: 'キャラ',
  place: '場所',
  rule: 'ルール',
  item: 'アイテム',
  mood: '雰囲気',
  obstacle: '障害物'
};
