const passport = require('passport');
const OAuth2Strategy = require('passport-oauth2').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const jwt = require('jsonwebtoken');

// OAuth2 Configuration
const OAUTH2_CONFIG = {
    authorizationURL: process.env.OAUTH2_AUTH_URL || 'http://localhost:3003/oauth/authorize',
    tokenURL: process.env.OAUTH2_TOKEN_URL || 'http://localhost:3003/oauth/token',
    clientID: process.env.OAUTH2_CLIENT_ID || 'shipping-service-client',
    clientSecret: process.env.OAUTH2_CLIENT_SECRET || 'shipping-service-secret',
    callbackURL: process.env.OAUTH2_CALLBACK_URL || 'http://localhost:3002/auth/callback',
    scope: 'read write shipping'
};

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_OPTIONS = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET
};

// OAuth2 Strategy
passport.use(new OAuth2Strategy(OAUTH2_CONFIG, 
    (accessToken, refreshToken, profile, done) => {
        // In a real application, you would validate the token with your OAuth server
        const user = {
            id: profile.id || 'user123',
            email: profile.email || 'user@example.com',
            accessToken: accessToken
        };
        return done(null, user);
    }
));

// JWT Strategy
passport.use(new JwtStrategy(JWT_OPTIONS, (payload, done) => {
    try {
        const user = {
            id: payload.sub || payload.id,
            email: payload.email,
            scope: payload.scope
        };
        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
}));

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { 
            sub: user.id, 
            email: user.email,
            scope: user.scope || 'read write shipping'
        }, 
        JWT_SECRET,
        { 
            expiresIn: '24h' // No timeout as requested
        }
    );
};

// Verify JWT Token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
};

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
        if (err) {
            return res.status(500).json({ error: 'Authentication error' });
        }
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized - Invalid or missing token' });
        }
        req.user = user;
        next();
    })(req, res, next);
};

// Middleware to check specific scopes
const hasScope = (requiredScope) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
        }
        
        const userScopes = req.user.scope ? req.user.scope.split(' ') : [];
        if (userScopes.includes(requiredScope) || userScopes.includes('admin')) {
            next();
        } else {
            res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
        }
    };
};

module.exports = {
    passport,
    generateToken,
    verifyToken,
    isAuthenticated,
    hasScope,
    OAUTH2_CONFIG
};
