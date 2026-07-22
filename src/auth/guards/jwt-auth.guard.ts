import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import type { AccessTokenPayload } from '../types/access-token-payload.type';

const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const accessToken = request.cookies?.[ACCESS_TOKEN_COOKIE_NAME];

    if (!accessToken) {
      throw new UnauthorizedException('Пользователь не авторизован');
    }

    try {
      const payload = await this.jwtService.verifyAsync<AccessTokenPayload>(
        accessToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        },
      );

      request.user = {
        id: payload.sub,
        email: payload.email,
        login: payload.login,
        sessionId: payload.sessionId,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Пользователь не авторизован');
    }
  }
}
