import { isIP } from 'node:net';

/**
 * Uma grafia só por endereço, para ele ter um contador só no limite de
 * tentativas. O IPv6 sai por extenso, com os oito grupos em minúsculas e sem
 * zeros à esquerda, e o IPv4 que chega embrulhado em IPv6
 * (`::ffff:203.0.113.7`) sai como IPv4. O que não é um IP volta como veio.
 */
export function canonicalIp(ip: string): string {
  if (isIP(ip) !== 6) {
    return ip;
  }
  const groups = ipv6Groups(ip);
  const [high, low] = groups.slice(6);
  const isMappedIpv4 =
    groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  return isMappedIpv4
    ? [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.')
    : groups.map((group) => group.toString(16)).join(':');
}

/** Os oito grupos de 16 bits de um IPv6 válido, em qualquer grafia. */
function ipv6Groups(ip: string): number[] {
  // A zona (`%eth0`) diz por qual interface o endereço chegou, e não quem ele é.
  const [address] = ip.split('%');
  const [head, tail] = address.split('::');
  const before = parseGroups(head);
  // Sem `::`, o endereço já traz os oito grupos.
  const after = tail === undefined ? [] : parseGroups(tail);
  const zeros = Array<number>(8 - before.length - after.length).fill(0);
  return [...before, ...zeros, ...after];
}

function parseGroups(part: string): number[] {
  if (part === '') {
    return [];
  }
  return part.split(':').flatMap((group) => {
    if (!group.includes('.')) {
      return [parseInt(group, 16)];
    }
    // Os últimos 32 bits escritos como IPv4 (`::ffff:203.0.113.7`).
    const [a, b, c, d] = group.split('.').map(Number);
    return [(a << 8) | b, (c << 8) | d];
  });
}
