const express = require('express');
const passport = require('passport');
const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// OAuth2 Server Configuration (not used, but kept for reference)

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
const JWT_OPTIONS = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET
};

// In-memory storage for OAuth2 (in production, use a database)
const clients = {
    'orders-service-client': {
        clientSecret: 'orders-service-secret',
        redirectUris: ['http://localhost:3000/auth/callback'],
        scopes: ['read', 'write']
    },
    'payments-service-client': {
        clientSecret: 'payments-service-secret',
        redirectUris: ['http://localhost:3001/auth/callback'],
        scopes: ['read', 'write', 'payments']
    },
    'shipping-service-client': {
        clientSecret: 'shipping-service-secret',
        redirectUris: ['http://localhost:3002/auth/callback'],
        scopes: ['read', 'write', 'shipping']
    }
};

const authorizationCodes = new Map();
const accessTokens = new Map();

// No OAuth2 Strategy needed for authorization server
// We only need JWT strategy for validating tokens

// JWT Strategy for validating tokens
passport.use(new JwtStrategy(JWT_OPTIONS, (payload, done) => {
    try {
        const user = {
            id: payload.sub || payload.id,
            email: payload.email,
            scope: payload.scope,
            type: payload.type || 'user'
        };
        return done(null, user);
    } catch (error) {
        return done(error, false);
    }
}));

// Generate JWT Token (no timeout as requested)
const generateToken = (user, scopes = []) => {
    return jwt.sign(
        { 
            sub: user.id, 
            email: user.email || user.id,
            scope: scopes.join(' '),
            type: user.type || 'user'
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

// OAuth2 Authorization Endpoint
const handleAuthorization = (req, res) => {
    const { client_id, redirect_uri, scope, state, response_type } = req.query;
    
    if (response_type !== 'code') {
        return res.status(400).json({ error: 'unsupported_response_type' });
    }
    
    const client = clients[client_id];
    if (!client) {
        return res.status(400).json({ error: 'invalid_client' });
    }
    
    if (!client.redirectUris.includes(redirect_uri)) {
        return res.status(400).json({ error: 'invalid_redirect_uri' });
    }
    
    // Generate authorization code
    const authCode = uuidv4();
    const requestedScopes = scope ? scope.split(' ') : ['read'];
    
    // Store authorization code
    authorizationCodes.set(authCode, {
        clientId: client_id,
        redirectUri: redirect_uri,
        scopes: requestedScopes,
        expiresAt: Date.now() + (10 * 60 * 1000) // 10 minutes
    });
    
    // Redirect to callback with authorization code
    const callbackUrl = `${redirect_uri}?code=${authCode}&state=${state || ''}`;
    res.redirect(callbackUrl);
};

// OAuth2 Token Endpoint
const handleToken = (req, res) => {
    const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;
    
    if (grant_type !== 'authorization_code') {
        return res.status(400).json({ error: 'unsupported_grant_type' });
    }
    
    const client = clients[client_id];
    if (!client || client.clientSecret !== client_secret) {
        return res.status(400).json({ error: 'invalid_client' });
    }
    
    const authCodeData = authorizationCodes.get(code);
    if (!authCodeData) {
        return res.status(400).json({ error: 'invalid_grant' });
    }
    
    if (authCodeData.clientId !== client_id) {
        return res.status(400).json({ error: 'invalid_grant' });
    }
    
    if (Date.now() > authCodeData.expiresAt) {
        authorizationCodes.delete(code);
        return res.status(400).json({ error: 'invalid_grant' });
    }
    
    // Generate access token
    const accessToken = uuidv4();
    const tokenData = {
        clientId: client_id,
        scopes: authCodeData.scopes,
        expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    
    accessTokens.set(accessToken, tokenData);
    authorizationCodes.delete(code);
    
    // Generate JWT token
    const jwtToken = generateToken({ id: client_id, type: 'client' }, authCodeData.scopes);
    
    res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 24 * 60 * 60, // 24 hours in seconds
        scope: authCodeData.scopes.join(' '),
        jwt_token: jwtToken
    });
};

// Validate Access Token
const validateAccessToken = (token) => {
    const tokenData = accessTokens.get(token);
    if (!tokenData || Date.now() > tokenData.expiresAt) {
        accessTokens.delete(token);
        return null;
    }
    return tokenData;
};

// Generate Service-to-Service Token for inter-service communication
const generateServiceToken = (serviceName, scope = 'read write') => {
    try {
        return jwt.sign(
            { 
                sub: serviceName, 
                email: `${serviceName}@internal`,
                scope: scope,
                type: 'service'
            }, 
            JWT_SECRET,
            { 
                expiresIn: '24h' // No timeout as requested
            }
        );
    } catch (error) {
        console.error('Error generating service token:', error);
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
    generateServiceToken,
    isAuthenticated,
    hasScope,
    handleAuthorization,
    handleToken,
    validateAccessToken
};
