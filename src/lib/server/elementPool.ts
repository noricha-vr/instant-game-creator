import type { ElementKind, GameElement } from '$lib/types';

const pool: Array<Omit<GameElement, 'id'>> = [
  { label: '時間を止めるカメ', kind: 'character', hint: 'ゆっくり動くけど一瞬だけ時間を止める' },
  { label: 'おにぎりロケット', kind: 'item', hint: '食べると少し飛べる' },
  { label: '雲の迷路', kind: 'place', hint: '壁がふわふわ動く' },
  { label: '泣き虫ドラゴン', kind: 'character', hint: '涙が足場になる' },
  { label: 'しゃべるランドセル', kind: 'item', hint: 'ヒントをくれるけど少しうるさい' },
  { label: '夜だけ光る公園', kind: 'place', hint: 'ライトを集めると道が見える' },
  { label: 'ジャンプ禁止', kind: 'rule', hint: '代わりにスライドやワープで進む' },
  { label: '逆さま重力', kind: 'rule', hint: '画面タップで上下が入れ替わる' },
  { label: 'おばけの郵便屋さん', kind: 'character', hint: '手紙を配ると敵が友だちになる' },
  { label: 'ゼリーの海', kind: 'place', hint: '跳ねる波に乗って進む' },
  { label: 'ねこ型UFO', kind: 'character', hint: '魚を集めるとスピードアップ' },
  { label: '巨大プリンの塔', kind: 'place', hint: '崩れる前に登る' },
  { label: '3秒だけ透明', kind: 'rule', hint: '敵をすり抜けられる' },
  { label: '笑うたび加速', kind: 'rule', hint: 'コンボでスピードが上がる' },
  { label: '虹色のスコップ', kind: 'item', hint: '地面を掘ると近道が出る' },
  { label: 'ミニ台風', kind: 'obstacle', hint: '巻き込まれるとスタート付近に戻る' },
  { label: 'チョコレート火山', kind: 'place', hint: '甘い溶岩を避ける' },
  { label: '眠たい忍者', kind: 'character', hint: '止まると寝るが寝ると分身する' },
  { label: '音符の階段', kind: 'place', hint: 'リズムに合わせると足場が出る' },
  { label: 'ふくらむ風船剣', kind: 'item', hint: '大きさで攻撃範囲が変わる' },
  { label: '触ると小さくなる壁', kind: 'obstacle', hint: '何度もぶつかると通れる' },
  { label: '迷子の月', kind: 'character', hint: '空から落ちないように案内する' },
  { label: 'からくり水族館', kind: 'place', hint: '魚の群れがスイッチになる' },
  { label: '1回だけ巻き戻し', kind: 'rule', hint: '失敗しても少し戻れる' },
  { label: 'ふわふわ爆弾', kind: 'obstacle', hint: '爆発ではなく風で吹き飛ばす' },
  { label: '星くずクッキー', kind: 'item', hint: '集めるほど夜空が完成する' },
  { label: 'ロボットの遠足', kind: 'mood', hint: '機械だけどのんびりした空気' },
  { label: '雨の日の秘密基地', kind: 'place', hint: '雨粒で装置が動く' },
  { label: 'くつした泥棒', kind: 'character', hint: '片方だけ奪って逃げる' },
  { label: '鏡の中のゴール', kind: 'rule', hint: '左右反転した世界に本物の出口がある' },
  { label: 'コインが逃げる', kind: 'rule', hint: '近づくと逃げるので囲む' },
  { label: '小さな宇宙船', kind: 'item', hint: '机の上の宇宙を探検する' },
  { label: 'ダンゴムシ王国', kind: 'place', hint: '丸まる住民たちが道を作る' },
  { label: 'にじむ絵の具モンスター', kind: 'obstacle', hint: '色を混ぜると弱点が変わる' },
  { label: 'トランポリン雲', kind: 'item', hint: '落ちても跳ね返る' },
  { label: 'まばたきワープ', kind: 'rule', hint: '一定時間ごとに位置が入れ替わる' },
  { label: 'お昼寝タイムアタック', kind: 'mood', hint: '急ぐけど眠くなる' },
  { label: 'お祭り迷宮', kind: 'place', hint: '屋台の明かりがヒント' },
  { label: 'たぬきの変身カード', kind: 'item', hint: '選んだ姿で能力が変わる' },
  { label: '転がる図書館', kind: 'place', hint: '本棚が坂道になる' },
  { label: 'シャボン玉シールド', kind: 'item', hint: '壊れる前にゴールへ運ぶ' },
  { label: '反対ことばの森', kind: 'place', hint: '右と言うと左へ進む' },
  { label: '足あとを食べる犬', kind: 'character', hint: '通った道が消える' },
  { label: '止まると増える敵', kind: 'rule', hint: '動き続けるほど安全' },
  { label: 'お城型スライム', kind: 'character', hint: '中に入って探検できる' },
  { label: '月曜日の魔法', kind: 'mood', hint: 'ちょっとだるいが不思議な力がある' },
  { label: '風で戻るブーメラン道', kind: 'obstacle', hint: '逆風を利用する' },
  { label: 'ペンギン消防隊', kind: 'character', hint: '水ではなく氷で火を止める' }
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
    { label: `${trimmed}の小さな勇者`, kind: 'character', hint: 'キーワードを主人公にする' },
    { label: `${trimmed}があふれる世界`, kind: 'place', hint: '舞台全体をキーワード寄りにする' },
    { label: `${trimmed}を集める`, kind: 'rule', hint: '目標を明確にする' },
    { label: `${trimmed}禁止ゾーン`, kind: 'obstacle', hint: '近づくとピンチになる場所' },
    { label: `${trimmed}コンボ`, kind: 'rule', hint: '連続成功で得点アップ' }
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
