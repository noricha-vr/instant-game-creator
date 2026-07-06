import { elementKindLabel, type ElementGroup, type ElementKind, type GameElement } from '$lib/types';

const pool: Record<ElementKind, string[]> = {
  subject: ['メダカ', 'アリ', 'ホタル', 'ふうせん', 'すなつぶ', 'スライム', 'ほし', 'はっぱ'],
  dynamics: ['むれる', 'おいかけっこ', 'たべる・たべられる', 'くっつく', 'ただよう', 'ぐるぐる回る', 'よけあう', 'ひろがる'],
  touch: ['タップでふえる', 'タップでエサ', 'タップでかべ', 'タップで風', 'タップでばくはつ', 'タップで光る', 'タップで集まる', 'タップで分かれる']
};

const elementKinds: ElementKind[] = ['subject', 'dynamics', 'touch'];

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

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  return labels.filter((label) => {
    const normalized = label.trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function labelsForKind(kind: ElementKind, keyword: string, limit: number): string[] {
  const trimmed = keyword.trim().slice(0, 24);
  const labels = uniqueLabels(kind === 'subject' && trimmed ? [trimmed, ...pool[kind]] : pool[kind]);
  if (kind === 'subject' && trimmed) {
    return [trimmed, ...shuffle(labels.filter((label) => label !== trimmed), `${kind}:${keyword}`).slice(0, limit - 1)];
  }
  return shuffle(labels, `${kind}:${keyword}:${Date.now()}`).slice(0, limit);
}

function shuffle(labels: string[], seed: string): string[] {
  const rng = createRng(seed);
  return labels
    .map((label, index) => ({ label, rank: rng() + index * 0.00001 }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ label }) => label);
}

/** Return simulation element groups for the creator UI. */
export function getElementGroups(keyword: string, perKind = 8): ElementGroup[] {
  const limit = Math.min(Math.max(perKind, 6), 8);
  return elementKinds.map((kind) => ({
    kind,
    label: elementKindLabel[kind],
    elements: labelsForKind(kind, keyword, limit).map(
      (label, index): GameElement => ({
        id: `${kind}-${hash(`${keyword}-${label}-${index}`)}`,
        kind,
        label
      })
    )
  }));
}
