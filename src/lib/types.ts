export type DirectionCard = {
  id: string;
  label: string;
  description: string;
};

export type GenerateRequest = {
  idea: string;
  direction?: Pick<DirectionCard, 'label' | 'description'>;
  instruction: string;
};

export type GeneratedAppPayload = {
  title: string;
  summary: string;
  howToUse: string[];
  html: string;
  adaptation: string | null;
};

export type AppRecord = GeneratedAppPayload & {
  id: string;
  slug: string;
  idea: string;
  direction: Pick<DirectionCard, 'label' | 'description'> | null;
  instruction: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  engine: 'html-v1';
  sharePath: string;
};

export type GalleryApp = Pick<
  AppRecord,
  'id' | 'slug' | 'title' | 'summary' | 'idea' | 'createdAt' | 'sharePath'
>;

export type SelectedElement = {
  kind: 'subject' | 'dynamics' | 'touch';
  label: string;
};

export type LegacyGameRecord = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  keyword: string;
  elements: SelectedElement[];
  controls: string[];
  workerScript: string;
  svelteComponent: string;
  instruction: string;
  createdAt: string;
  updatedAt: string;
  attempts: number;
  engine: 'canvas-worker-sim-v1';
  sharePath: string;
};

export type SharedRecord = AppRecord | LegacyGameRecord;

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
