import { Body, Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Type } from 'class-transformer';
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
  });
});
