import { describe, expect, test } from 'bun:test';
import { injectCsp, validateGeneratedAppPayload } from '../src/lib/server/validateGeneratedHtml';

function completeHtml(body = '<button type="button">動く</button>') {
  return `<!doctype html><html lang="ja"><head><title>test</title></head><body>${body}${'<p>content</p>'.repeat(40)}</body></html>`;
}

describe('injectCsp', () => {
  test('places the policy before active content and keeps standards mode', () => {
    const html = `<!doctype html>
<html lang="ja">
<script>new Image().src = '/network-sink?early=1';</script>
<head><title>stored app</title></head>
<body><button>動く</button></body>
</html>`;

    const secured = injectCsp(html);
    const policyIndex = secured.indexOf('Content-Security-Policy');

    expect(secured.toLowerCase().startsWith('<!doctype html>')).toBe(true);
    expect(policyIndex).toBeGreaterThan(0);
    expect(policyIndex).toBeLessThan(secured.indexOf('<script>'));
    expect(secured).toContain("frame-src 'none'");
    expect(secured).toContain("form-action 'none'");
  });

  test('adds an independent safe policy before a stored policy', () => {
    const html = `<html><head>
<meta http-equiv="content-security-policy" content="default-src *">
</head><body>stored</body></html>`;

    const secured = injectCsp(html);

    expect(secured.match(/content-security-policy/gi)).toHaveLength(2);
    expect(secured).toContain('default-src *');
    expect(secured.indexOf('Content-Security-Policy')).toBeLessThan(secured.indexOf('<body>'));
  });

  test('does not parse quoted greater-than signs or head-like strings', () => {
    const html = `<html lang="ja" dir="rtl" data-note=">"><script>
const fake = '<head><meta http-equiv="Content-Security-Policy" content="default-src *">';
const text = '<!doctype svg>';
</script><body>stored</body></html>`;

    const secured = injectCsp(html);

    expect(secured.indexOf('Content-Security-Policy')).toBeLessThan(secured.indexOf('<script>'));
    expect(secured).toContain('data-note=">"');
    expect(secured).toContain("const text = '<!doctype svg>'");
  });
});

describe('validateGeneratedAppPayload', () => {
  test('accepts a complete app and applies the trusted policy prefix', () => {
    const payload = validateGeneratedAppPayload({
      title: ' テスト ',
      summary: '説明',
      howToUse: ['1', '2', '3', '4', '5'],
      html: completeHtml(),
      adaptation: ' ひとり用 '
    });

    expect(payload.title).toBe(' テスト ');
    expect(payload.howToUse).toEqual(['1', '2', '3', '4']);
    expect(payload.adaptation).toBe('ひとり用');
    expect(payload.html.startsWith('<!doctype html>\n<head>')).toBe(true);
  });

  test.each([
    [null, 'オブジェクト'],
    [{ title: 'x', summary: '説明', howToUse: [], html: '<html></html>' }, 'between 500'],
    [
      { title: 'x', summary: '説明', howToUse: ['使う'], html: completeHtml('<script>fetch("/x")</script>') },
      'fetch is not allowed'
    ],
    [{ title: 'x', summary: '説明', howToUse: [1], html: completeHtml() }, 'string array']
  ])('rejects an invalid generated payload', (value, message) => {
    expect(() => validateGeneratedAppPayload(value)).toThrow(message);
  });
});
