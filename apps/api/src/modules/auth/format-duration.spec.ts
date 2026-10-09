import { formatDuration } from './format-duration.js';

describe('formatDuration', () => {
  it.each([
    [86_400, '24 horas'],
    [3600, '1 hora'],
    [5400, '90 minutos'],
    [900, '15 minutos'],
    [60, '1 minuto'],
    [61, '2 minutos'],
    [1, '1 minuto'],
  ])('escreve %i segundos como "%s"', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text);
  });
});
