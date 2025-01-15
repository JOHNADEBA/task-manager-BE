import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor() {
    console.log(process.env.JWT_SECRET_REFRESH);

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'), // Get token from the request body
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET_REFRESH, // Ensure you have a secret for refresh token
    });
  }

  async validate(payload: any) {
    // Validate the refresh token payload (usually you don't do much here)
    return { userId: payload.sub };
  }
}
