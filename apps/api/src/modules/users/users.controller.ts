import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/auth.guard.js';
import { CurrentUserId } from '../../common/auth/current-user-id.decorator.js';
import { UsersService } from './users.service.js';

/** O Usuário autenticado, como a rota o devolve. */
interface MeResponse {
  id: string;
  email: string;
}

@Controller('me')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async me(@CurrentUserId() userId: string): Promise<MeResponse> {
    const user = await this.users.getAuthenticated(userId);
    return { id: user.id, email: user.email };
  }
}
