import { canonicalIp } from './canonical-ip.js';

describe('canonicalIp', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['::FFFF:203.0.113.7', '203.0.113.7'],
    ['::ffff:cb00:7107', '203.0.113.7'],
    ['0:0:0:0:0:ffff:cb00:7107', '203.0.113.7'],
    ['2001:db8::8', '2001:db8:0:0:0:0:0:8'],
    ['2001:0DB8:0000:0000:0000:0000:0000:0008', '2001:db8:0:0:0:0:0:8'],
    ['2001:db8:0:0:0:0:0:8', '2001:db8:0:0:0:0:0:8'],
    ['2001:db8::', '2001:db8:0:0:0:0:0:0'],
    ['::1', '0:0:0:0:0:0:0:1'],
    ['::', '0:0:0:0:0:0:0:0'],
    ['fe80::1%eth0', 'fe80:0:0:0:0:0:0:1'],
    // Só o prefixo `::ffff:` embrulha um IPv4.
    ['64:ff9b::203.0.113.7', '64:ff9b:0:0:0:0:cb00:7107'],
  ])('escreve %s como %s', (ip, canonical) => {
    expect(canonicalIp(ip)).toBe(canonical);
  });

  it.each(['unknown', '', 'não é um IP', '203.0.113.7, 203.0.113.8'])(
    'devolve como veio o que não é um IP (%j)',
    (value) => {
      expect(canonicalIp(value)).toBe(value);
    },
  );
});
