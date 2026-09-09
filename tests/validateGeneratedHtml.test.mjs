import { describe, expect, test } from 'bun:test';
import { injectCsp } from '../src/lib/server/validateGeneratedHtml';

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

  test('replaces stored policies without weakening the safe policy', () => {
    const html = `<html><head>
<meta http-equiv="content-security-policy" content="default-src *">
</head><body>stored</body></html>`;

    const secured = injectCsp(html);

    expect(secured.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(1);
    expect(secured).not.toContain('default-src *');
    expect(secured.indexOf('Content-Security-Policy')).toBeLessThan(secured.indexOf('<body>'));
  });

  test('does not trust head-like strings or alter doctype text inside scripts', () => {
    const html = `<html><script>
const fake = '<head><meta http-equiv="Content-Security-Policy" content="default-src *">';
const text = '<!doctype svg>';
</script><body>stored</body></html>`;

    const secured = injectCsp(html);

    expect(secured.indexOf('Content-Security-Policy')).toBeLessThan(secured.indexOf('<script>'));
    expect(secured).toContain("const text = '<!doctype svg>'");
    expect(secured).not.toContain('default-src *');
  });
});
