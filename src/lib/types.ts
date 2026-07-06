export type ElementKind = 'subject' | 'dynamics' | 'touch';

export const elementKindLabel: Record<ElementKind, string> = {
  subject: '主役',
  dynamics: 'うごき・おたがい',
  touch: 'さわると'
};

export type GameElement = {
  id: string;
  label: string;
  kind: ElementKind;
  hint?: string;
};

export type ElementGroup = {
  kind: ElementKind;
  label: string;
  elements: GameElement[];
};

export type SelectedElement = {
  kind: ElementKind;
  label: string;
};

export type GenerateRequest = {
  keyword: string;
  elements: SelectedElement[];
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
  elements: SelectedElement[];
  instruction: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  engine: 'canvas-worker-sim-v1';
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
  stats?: Record<string, number | string>;
  message?: string;
};
