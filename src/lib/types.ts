export type ElementKind = 'character' | 'place' | 'rule' | 'item' | 'mood' | 'obstacle';

export type GameElement = {
  id: string;
  label: string;
  kind: ElementKind;
  hint?: string;
};

export type GenerateRequest = {
  keyword: string;
  elements: string[];
  instruction: string;
};

export type GeneratedGamePayload = {
  title: string;
  summary: string;
  controls: string[];
  workerScript: string;
  svelteComponent: string;
};

export type GameRecord = GeneratedGamePayload & {
  id: string;
  slug: string;
  keyword: string;
  elements: string[];
  instruction: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  engine: 'canvas-worker-v1';
  sharePath: string;
};

export type GalleryGame = Pick<
  GameRecord,
  'id' | 'slug' | 'title' | 'summary' | 'keyword' | 'elements' | 'createdAt' | 'sharePath'
>;

export type DrawCommand =
  | {
      type: 'rect';
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
      radius?: number;
    }
  | {
      type: 'circle';
      x: number;
      y: number;
      r: number;
      fill?: string;
      stroke?: string;
      lineWidth?: number;
    }
  | {
      type: 'line';
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke?: string;
      lineWidth?: number;
    }
  | {
      type: 'text';
      text: string;
      x: number;
      y: number;
      size?: number;
      fill?: string;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
      maxWidth?: number;
    };

export type WorkerFrame = {
  type: 'frame';
  background?: string;
  shapes: DrawCommand[];
  score?: number;
  message?: string;
  timeLeft?: number;
};
