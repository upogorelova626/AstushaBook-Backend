import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/types/authenticated-request.type';
import { SearchUsersDto } from './dto/search-users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiCookieAuth('accessToken')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('search')
  @ApiOperation({
    summary: 'Найти пользователей Astusha ID',
  })
  @ApiOkResponse({
    description: 'Найденные пользователи',
  })
  search(@Body() dto: SearchUsersDto, @Req() request: AuthenticatedRequest) {
    return this.usersService.search(dto.query, request.cookies.accessToken!);
  }
}
