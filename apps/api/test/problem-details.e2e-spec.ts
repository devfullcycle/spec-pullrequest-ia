import {
  Body,
  Controller,
  Get,
  HttpException,
  INestApplication,
  Logger,
  Post,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import type { Response } from 'express';
import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DomainError } from '../src/common/errors/domain-error.js';
import { FieldError } from '../src/common/errors/input-validation.error.js';
import { createTestApp } from './support/create-test-app.js';
import { expectProblem } from './support/problem.js';

class ProbeAddressDto {
  @IsString()
  @MinLength(2)
  city: string;
}

class ProbeDto {
  @IsEmail()
  email: string;

  @ValidateNested()
  @Type(() => ProbeAddressDto)
  address: ProbeAddressDto;
}

class ProbeInvalidMoveError extends DomainError {
  readonly code = 'invalid_move';

  constructor() {
    super('A pasta não pode ser movida para dentro dela mesma.');
  }
}

// Rotas que só existem neste teste: a fundação ainda não tem rota de negócio.
@Controller('probe')
class ProbeController {
  @Get()
  ok() {
    return { ok: true };
  }

  @Post('validated')
  validated(@Body() body: ProbeDto) {
    return body;
  }

  @Get('domain-error')
  domainError() {
    throw new ProbeInvalidMoveError();
  }

  @Get('unexpected-error')
  unexpectedError() {
    throw new Error('segredo interno: a senha do banco é hunter2');
  }

  // Como o erro de um SDK de terceiro, que traz o status da chamada que ele fez.
  @Get('third-party-error')
  thirdPartyError() {
    throw Object.assign(new Error('bucket interno hunter2 não existe'), {
      statusCode: 404,
    });
  }

  // Um erro de terceiro com o mesmo formato dos erros do leitor do corpo.
  @Get('third-party-error-like-body-reader')
  thirdPartyErrorLikeBodyReader() {
    throw Object.assign(new Error('recurso interno hunter2 não existe'), {
      expose: true,
      type: 'sdk_error',
      statusCode: 404,
    });
  }

  @Get('deliberate-503')
  deliberate503() {
    throw new ServiceUnavailableException('fila interna hunter2 fora do ar');
  }

  @Get('redirect-as-exception')
  redirectAsException() {
    throw new HttpException('destino interno hunter2', 302);
  }

  @Get('status-out-of-range')
  statusOutOfRange() {
    throw new HttpException('status que veio de outro serviço', 1000);
  }

  @Get('error-after-headers')
  errorAfterHeaders(@Res() response: Response) {
    response.status(200).type('text/plain').write('começo da resposta');
    throw new Error('falhou depois de começar a responder');
  }
}

describe('Formato de erro da API (RFC 9457)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({ controllers: [ProbeController] });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('prefixo', () => {
    it('serve as rotas sob /v1', async () => {
      await request(app.getHttpServer())
        .get('/v1/probe')
        .expect(200, { ok: true });
    });

    it('não serve as rotas fora de /v1', async () => {
      await request(app.getHttpServer()).get('/probe').expect(404);
    });
  });

  describe('entrada inválida', () => {
    it('devolve application/problem+json com o code validation_error', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/probe/validated')
        .send({ email: 'não é e-mail', address: { city: 'X' } })
        .expect(400);

      expectProblem(response, {
        title: 'Bad Request',
        status: 400,
        code: 'validation_error',
        detail: expect.any(String),
        errors: expect.any(Array),
      });
    });

    it('diz quais campos estão errados, inclusive os aninhados', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/probe/validated')
        .send({ email: 'não é e-mail', address: { city: 'X' } })
        .expect(400);

      const errors = response.body.errors as FieldError[];
      expect(errors.map((error) => error.field).sort()).toEqual([
        'address.city',
        'email',
      ]);
      for (const error of errors) {
        expect(error.messages.length).toBeGreaterThan(0);
      }
    });

    it.each([[[1, 2]], [['a']], [[]]])(
      'aponta um campo em todo erro quando o corpo é %j, e não um objeto',
      async (body) => {
        const response = await request(app.getHttpServer())
          .post('/v1/probe/validated')
          .send(body)
          .expect(400);

        expect(response.body.code).toBe('validation_error');
        const errors = response.body.errors as FieldError[];
        expect(errors.length).toBeGreaterThan(0);
        for (const error of errors) {
          expect(typeof error.field).toBe('string');
          expect(error.field).not.toContain('undefined');
        }
      },
    );

    it('trata um corpo JSON malformado como validation_error', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/probe/validated')
        .set('Content-Type', 'application/json')
        .send('{"email": ')
        .expect(400);

      expectProblem(response, {
        title: 'Bad Request',
        status: 400,
        code: 'validation_error',
      });
    });

    it('recusa um corpo grande demais com o status do leitor do corpo', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/probe/validated')
        .send({ email: 'ana@example.com', filler: 'x'.repeat(200_000) })
        .expect(413);

      expectProblem(response, {
        title: 'Payload Too Large',
        status: 413,
        code: 'payload_too_large',
      });
    });

    it('aceita a entrada válida e descarta os campos desconhecidos', async () => {
      await request(app.getHttpServer())
        .post('/v1/probe/validated')
        .send({
          email: 'ana@example.com',
          address: { city: 'Recife' },
          admin: true,
        })
        .expect(201, {
          email: 'ana@example.com',
          address: { city: 'Recife' },
        });
    });
  });

  describe('rota inexistente', () => {
    it('devolve 404 no formato RFC 9457, com o code not_found', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/rota-que-nao-existe')
        .expect(404);

      expectProblem(response, {
        title: 'Not Found',
        status: 404,
        code: 'not_found',
      });
    });
  });

  describe('erro de domínio', () => {
    it('sai com o status do code e a mensagem do erro em detail', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/probe/domain-error')
        .expect(400);

      expectProblem(response, {
        title: 'Bad Request',
        status: 400,
        code: 'invalid_move',
        detail: 'A pasta não pode ser movida para dentro dela mesma.',
      });
    });
  });

  describe('erro inesperado', () => {
    it('devolve 500 no formato RFC 9457, sem vazar detalhes internos', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/probe/unexpected-error')
        .expect(500);

      expectProblem(response, {
        title: 'Internal Server Error',
        status: 500,
        code: 'internal_error',
      });
      expect(response.text).not.toContain('hunter2');
      expect(response.text).not.toContain('stack');
    });

    it.each(['third-party-error', 'third-party-error-like-body-reader'])(
      'não confia no statusCode de um erro que não veio do framework (%s)',
      async (route) => {
        const response = await request(app.getHttpServer())
          .get(`/v1/probe/${route}`)
          .expect(500);

        expectProblem(response, {
          title: 'Internal Server Error',
          status: 500,
          code: 'internal_error',
        });
      },
    );

    it.each(['redirect-as-exception', 'status-out-of-range'])(
      'trata como inesperada uma HttpException cujo status não é de erro (%s)',
      async (route) => {
        const response = await request(app.getHttpServer())
          .get(`/v1/probe/${route}`)
          .expect(500);

        expectProblem(response, {
          title: 'Internal Server Error',
          status: 500,
          code: 'internal_error',
        });
      },
    );

    it('encerra a conexão quando a falha vem depois de a resposta ter começado', async () => {
      // O log é a única saída que distingue este caso: o cliente só vê a conexão cair.
      const logged = vi.spyOn(Logger.prototype, 'error');
      try {
        await expect(
          request(app.getHttpServer()).get('/v1/probe/error-after-headers'),
        ).rejects.toThrow();

        // Só a falha original vai para o log, uma vez, e não o erro de tentar
        // escrever uma segunda resposta.
        expect(logged).toHaveBeenCalledTimes(1);
        expect(String(logged.mock.calls[0][0])).toContain(
          'falhou depois de começar a responder',
        );
      } finally {
        logged.mockRestore();
      }

      // A aplicação continua de pé para a requisição seguinte.
      await request(app.getHttpServer()).get('/v1/probe').expect(200);
    });
  });

  describe('erro 5xx lançado de propósito', () => {
    it('mantém o status e usa o nome dele como code, sem vazar a mensagem', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/probe/deliberate-503')
        .expect(503);

      expectProblem(response, {
        title: 'Service Unavailable',
        status: 503,
        code: 'service_unavailable',
      });
      expect(response.text).not.toContain('hunter2');
    });
  });
});
