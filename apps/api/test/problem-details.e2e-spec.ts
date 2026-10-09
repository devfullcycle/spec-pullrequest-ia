import {
  Body,
  Controller,
  Get,
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
import { createTestApp } from './support/create-test-app.js';

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

  @Get('deliberate-503')
  deliberate503() {
    throw new ServiceUnavailableException('fila interna hunter2 fora do ar');
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

      expect(response.headers['content-type']).toMatch(
        /^application\/problem\+json/,
      );
      expect(response.body).toMatchObject({
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        code: 'validation_error',
      });
    });

    it('diz quais campos estão errados, inclusive os aninhados', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/probe/validated')
        .send({ email: 'não é e-mail', address: { city: 'X' } })
        .expect(400);

      const errors = response.body.errors as {
        field: string;
        messages: string[];
      }[];
      expect(errors.map((error) => error.field).sort()).toEqual([
        'address.city',
        'email',
      ]);
      for (const error of errors) {
        expect(error.messages.length).toBeGreaterThan(0);
      }
    });

    it('trata um corpo JSON malformado como validation_error', async () => {
      const response = await request(app.getHttpServer())
        .post('/v1/probe/validated')
        .set('Content-Type', 'application/json')
        .send('{"email": ')
        .expect(400);

      expect(response.headers['content-type']).toMatch(
        /^application\/problem\+json/,
      );
      expect(response.body).toMatchObject({
        status: 400,
        code: 'validation_error',
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

      expect(response.headers['content-type']).toMatch(
        /^application\/problem\+json/,
      );
      expect(response.body).toEqual({
        type: 'about:blank',
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

      expect(response.headers['content-type']).toMatch(
        /^application\/problem\+json/,
      );
      expect(response.body).toEqual({
        type: 'about:blank',
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

      expect(response.headers['content-type']).toMatch(
        /^application\/problem\+json/,
      );
      expect(response.body).toEqual({
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        code: 'internal_error',
      });
      expect(response.text).not.toContain('hunter2');
      expect(response.text).not.toContain('stack');
    });

    it('não confia no statusCode de um erro que não veio do framework', async () => {
      const response = await request(app.getHttpServer())
        .get('/v1/probe/third-party-error')
        .expect(500);

      expect(response.body).toEqual({
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        code: 'internal_error',
      });
    });

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

      expect(response.headers['content-type']).toMatch(
        /^application\/problem\+json/,
      );
      expect(response.body).toEqual({
        type: 'about:blank',
        title: 'Service Unavailable',
        status: 503,
        code: 'service_unavailable',
      });
      expect(response.text).not.toContain('hunter2');
    });
  });
});
