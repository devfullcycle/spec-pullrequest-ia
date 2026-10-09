import { ExecutionContext, Logger } from '@nestjs/common';
import { ClientIpGuard, RequestWithClientIp } from './client-ip.guard.js';

const SECRET = 'um-segredo-com-mais-de-32-caracteres';

function requestWith(headers: Record<string, string>): RequestWithClientIp {
  return {
    headers,
    socket: { remoteAddress: '::ffff:10.0.0.9' },
  } as unknown as RequestWithClientIp;
}

function run(guard: ClientIpGuard, headers: Record<string, string>): string {
  const request = requestWith(headers);
  guard.canActivate({
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext);
  return request.clientIp;
}

describe('ClientIpGuard', () => {
  let guard: ClientIpGuard;
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    guard = new ClientIpGuard({
      port: 3000,
      webOrigin: 'http://localhost:3000',
      internalApiSecret: SECRET,
    });
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('usa o IP repassado, numa grafia só, quando o segredo confere', () => {
    const ip = run(guard, {
      'x-client-ip': '2001:DB8::8',
      'x-internal-secret': SECRET,
    });

    expect(ip).toBe('2001:db8:0:0:0:0:0:8');
    expect(warn).not.toHaveBeenCalled();
  });

  it('usa o IP da conexão, sem aviso, quando o segredo não vem', () => {
    expect(run(guard, { 'x-client-ip': '203.0.113.7' })).toBe('10.0.0.9');
    expect(warn).not.toHaveBeenCalled();
  });

  it('usa o IP da conexão e avisa no log, sem o valor recebido, quando o segredo não confere', () => {
    const ip = run(guard, {
      'x-client-ip': '203.0.113.7',
      'x-internal-secret': 'um-segredo-de-outro-ambiente',
    });

    expect(ip).toBe('10.0.0.9');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).not.toContain(
      'um-segredo-de-outro-ambiente',
    );
  });

  it('repete o aviso do segredo recusado no máximo uma vez por minuto', () => {
    vi.useFakeTimers();
    const wrong = { 'x-internal-secret': 'um-segredo-de-outro-ambiente' };

    run(guard, wrong);
    run(guard, wrong);
    vi.advanceTimersByTime(59_000);
    run(guard, wrong);
    expect(warn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1_000);
    run(guard, wrong);
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
