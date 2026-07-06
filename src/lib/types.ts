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
