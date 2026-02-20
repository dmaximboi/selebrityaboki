import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    private readonly logger = new Logger(GoogleStrategy.name);

    constructor(private readonly configService: ConfigService) {
        const backendUrl = configService.get<string>('BACKEND_URL') || 'http://localhost:4000';
        const callbackURL = `${backendUrl}/api/auth/google/callback`;

        const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
        const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

        if (!clientID || !clientSecret) {
            throw new Error('Google OAuth credentials are not configured (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)');
        }

        super({
            clientID,
            clientSecret,
            callbackURL,
            scope: ['email', 'profile'],
        });

        // Safe startup confirmation — no sensitive values logged
        const logger = new Logger(GoogleStrategy.name);
        logger.log(`Google OAuth initialized. Callback: ${callbackURL}`);
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback
    ): Promise<void> {
        try {
            const { id, name, emails, photos } = profile;

            if (!emails || emails.length === 0) {
                this.logger.error('Google profile has no email');
                return done(new Error('No email returned from Google'), undefined);
            }

            const user = {
                googleId: id,
                email: emails[0].value,
                firstName: name?.givenName || '',
                lastName: name?.familyName || '',
                picture: photos?.[0]?.value || '',
            };

            this.logger.log(`Google profile validated for: ${user.email}`);
            done(null, user);
        } catch (err: any) {
            this.logger.error(`Google validate error: ${err.message}`, err.stack);
            done(err, undefined);
        }
    }
}
