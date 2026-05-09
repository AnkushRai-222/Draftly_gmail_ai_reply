const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const prisma = require('./db');
const { encrypt } = require('../utils/encryption');
const logger = require('../utils/logger');

const configurePassport = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email found in Google profile'), null);

          // Encrypt tokens before storing
          const encryptedAccess = encrypt(accessToken);
          const encryptedRefresh = refreshToken ? encrypt(refreshToken) : encrypt('');

          // Upsert user — create on first login, update tokens on subsequent logins
          const user = await prisma.user.upsert({
            where: { googleId: profile.id },
            update: {
              accessToken: encryptedAccess,
              refreshToken: encryptedRefresh,
              name: profile.displayName,
              picture: profile.photos?.[0]?.value,
            },
            create: {
              googleId: profile.id,
              email,
              name: profile.displayName,
              picture: profile.photos?.[0]?.value,
              accessToken: encryptedAccess,
              refreshToken: encryptedRefresh,
              // Create default preferences on first signup
              preference: {
                create: {
                  defaultTone: 'professional',
                  autoGenerate: false,
                },
              },
            },
          });

          logger.info(`User authenticated: ${email}`);
          return done(null, user);
        } catch (error) {
          logger.error('Passport strategy error:', error);
          return done(error, null);
        }
      }
    )
  );

  // Not using session-based auth (we use JWT), but passport requires these
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

module.exports = configurePassport;
