const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

const googleConfigured =
    Boolean(process.env.GOOGLE_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET);

if (googleConfigured) {

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,

                callbackURL:
                    process.env.GOOGLE_CALLBACK_URL ||
                    "https://job-portal-system-y666.onrender.com/api/auth/google/callback"
            },

            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value
                        ?.trim()
                        .toLowerCase();

                    const googleEmailVerified =
                        profile._json?.email_verified === true;

                    if (!email || !googleEmailVerified) {
                        return done(
                            new Error("A verified Google email is required"),
                            null
                        );
                    }

                    let user = await User.findOne({ email });

                    if (!user) {
                        user = await User.create({
                            name: profile.displayName,
                            email,
                            avatar: profile.photos?.[0]?.value,
                            isVerified: true,
                            googleId: profile.id
                        });

                    } else if (
                        user.googleId &&
                        user.googleId !== profile.id
                    ) {
                        return done(
                            new Error("Google account mismatch"),
                            null
                        );

                    } else if (!user.googleId) {
                        user.googleId = profile.id;
                        await user.save();
                    }

                    return done(null, user);

                } catch (err) {
                    console.error(
                        "Google authentication error:",
                        err.message
                    );

                    return done(err, null);
                }
            }
        )
    );

    console.log("Google OAuth configured successfully.");

} else {
    console.warn(
        "Google OAuth disabled: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing."
    );
}

module.exports = passport;
