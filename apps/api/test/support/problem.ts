import type { Response } from 'supertest';

interface ExpectedProblem {
  status: number;
  title: string;
  code: string;
  [member: string]: unknown;
}

/**
 * Confere que a resposta é um erro no formato da API: `application/problem+json`
 * e o corpo exato, sem nenhum campo além dos esperados.
 */
export function expectProblem(
  response: Response,
  expected: ExpectedProblem,
): void {
  expect(response.headers['content-type']).toMatch(
    /^application\/problem\+json/,
  );
  expect(response.body).toEqual({ type: 'about:blank', ...expected });
}
