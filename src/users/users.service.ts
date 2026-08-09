import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type { AstushaUserPreview } from './types/astusha-user-preview.type';

@Injectable()
export class UsersService {
  constructor(
    private readonly http: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async search(
    query: string,
    accessToken: string,
  ): Promise<AstushaUserPreview[]> {
    const apiUrl = this.configService.getOrThrow<string>('ASTUSHA_ID_API_URL');

    const response = await firstValueFrom(
      this.http.post<AstushaUserPreview[]>(
        `${apiUrl}/users/search`,
        {
          query,
        },
        {
          headers: {
            Cookie: `accessToken=${encodeURIComponent(accessToken)}`,
          },
        },
      ),
    );

    return response.data;
  }

  async getByIds(
    ids: string[],
    accessToken: string,
  ): Promise<AstushaUserPreview[]> {
    if (ids.length === 0) {
      return [];
    }

    const apiUrl = this.configService.getOrThrow<string>('ASTUSHA_ID_API_URL');
    const response = await firstValueFrom(
      this.http.post<AstushaUserPreview[]>(
        `${apiUrl}/users/by-ids`,
        {
          ids,
        },
        {
          headers: {
            Cookie: `accessToken=${encodeURIComponent(accessToken)}`,
          },
        },
      ),
    );

    return response.data;
  }
}
