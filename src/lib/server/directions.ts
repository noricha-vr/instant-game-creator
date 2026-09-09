import type { DirectionCard } from '$lib/types';

type DirectionResponse = {
  directions?: unknown;
};

/** Normalize an untrusted direction response into three or four cards. */
export function normalizeDirections(value: unknown): DirectionCard[] {
  if (!value || typeof value !== 'object') {
    throw new Error('directions response must be an object');
  }
  const candidate = value as DirectionResponse;
  if (!Array.isArray(candidate.directions)) {
    throw new Error('directions must be an array');
  }

  const directions = candidate.directions
    .map((item): Pick<DirectionCard, 'label' | 'description'> | null => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const label = typeof record.label === 'string' ? record.label.trim().slice(0, 12) : '';
      const description = typeof record.description === 'string' ? record.description.trim().slice(0, 40) : '';
      return label && description ? { label, description } : null;
    })
    .filter((item): item is Pick<DirectionCard, 'label' | 'description'> => item !== null)
    .slice(0, 4)
    .map((item, index) => ({ id: `d${index + 1}`, ...item }));

  if (directions.length < 3) {
    throw new Error('directions must contain at least 3 cards');
  }
  return directions;
}
