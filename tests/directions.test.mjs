import { describe, expect, test } from 'bun:test';
import { normalizeDirections } from '../src/lib/server/directions';

describe('normalizeDirections', () => {
  test('keeps four valid cards and applies response limits', () => {
    const directions = normalizeDirections({
      directions: [
        { label: '  方向その一は長すぎます  ', description: `${'説'.repeat(50)}  ` },
        { label: '方向2', description: '説明2' },
        { label: '方向3', description: '説明3' },
        { label: '方向4', description: '説明4' },
        { label: '方向5', description: '説明5' }
      ]
    });

    expect(directions).toHaveLength(4);
    expect(directions[0]).toEqual({ id: 'd1', label: '方向その一は長すぎます', description: '説'.repeat(40) });
    expect(directions[3]?.id).toBe('d4');
  });

  test.each([
    [null, 'object'],
    [{ directions: 'invalid' }, 'array'],
    [{ directions: [{ label: '1', description: 'a' }, { label: '2', description: 'b' }] }, 'at least 3']
  ])('rejects malformed direction responses', (value, message) => {
    expect(() => normalizeDirections(value)).toThrow(message);
  });
});
