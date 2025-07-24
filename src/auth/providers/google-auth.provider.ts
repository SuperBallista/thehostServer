// auth/providers/google-oauth.provider.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleOAuthProvider {
  private readonly redirectUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly scopes: string[];
  private readonly authUrl: string =
    'https://accounts.google.com/o/oauth2/auth';
  private readonly tokenUrl: string = 'https://oauth2.googleapis.com/token';

  constructor(private readonly configService: ConfigService) {
    this.redirectUrl = this.configService.get<string>(
      'GOOGLE_REDIRECT_URL',
    ) as string;
    this.clientId = this.configService.get<string>(
      'GOOGLE_CLIENT_ID',
    ) as string;
    this.clientSecret = this.configService.get<string>(
      'GOOGLE_CLIENT_SECRET',
    ) as string;
    this.scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];
  }

  getAuthUrl(state: string = 'state-token'): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUrl,
      response_type: 'code',
      scope: this.scopes.join(' '),
      access_type: 'offline',
      state: state,
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  getTokenOptions(code: string) {
    return {
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUrl,
      grant_type: 'authorization_code',
    };
  }

  getTokenUrl(): string {
    return this.tokenUrl;
  }
}
