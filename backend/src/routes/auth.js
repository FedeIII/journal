import Boom from '@hapi/boom';
import Joi from 'joi';
import pool from '../config/database.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';

const authRoutes = [
  // Register with email/password
  {
    method: 'POST',
    path: '/api/register',
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().min(6).required(),
          name: Joi.string().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { email, password, name } = request.payload;

      try {
        // Check if user already exists
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          [email]
        );

        if (existingUser.rows.length > 0) {
          throw Boom.conflict('User already exists');
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const result = await pool.query(
          'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
          [email, passwordHash, name]
        );

        const user = result.rows[0];
        const token = generateToken(user.id, user.email);

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        };
      } catch (err) {
        if (err.isBoom) throw err;
        console.error('Registration error:', err);
        throw Boom.internal('Registration failed');
      }
    },
  },

  // Login with email/password
  {
    method: 'POST',
    path: '/api/login',
    options: {
      auth: false,
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
          password: Joi.string().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { email, password } = request.payload;

      try {
        const result = await pool.query(
          'SELECT id, email, password_hash, name FROM users WHERE email = $1',
          [email]
        );

        if (result.rows.length === 0) {
          throw Boom.unauthorized('Invalid credentials');
        }

        const user = result.rows[0];

        // Check password
        const isValid = await comparePassword(password, user.password_hash);
        if (!isValid) {
          throw Boom.unauthorized('Invalid credentials');
        }

        const token = generateToken(user.id, user.email);

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          token,
        };
      } catch (err) {
        if (err.isBoom) throw err;
        console.error('Login error:', err);
        throw Boom.internal('Login failed');
      }
    },
  },

  // Google OAuth - Initiate
  {
    method: 'GET',
    path: '/api/auth/google',
    options: {
      auth: false,
    },
    handler: async (request, h) => {
      const googleAuthUrl =
        'https://accounts.google.com/o/oauth2/v2/auth?' +
        `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI)}&` +
        'response_type=code&' +
        'scope=email profile&' +
        'access_type=offline';

      return h.redirect(googleAuthUrl);
    },
  },

  // Google OAuth - Callback
  {
    method: 'GET',
    path: '/api/auth/google/callback',
    options: {
      auth: false,
    },
    handler: async (request, h) => {
      const { code } = request.query;

      if (!code) {
        throw Boom.badRequest('Authorization code missing');
      }

      try {
        // Exchange code for token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI,
            grant_type: 'authorization_code',
          }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
          throw Boom.badRequest('Token exchange failed');
        }

        // Get user info
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        const googleUser = await userResponse.json();

        // Check if user exists
        let user;
        const existingUser = await pool.query(
          'SELECT id, email, name FROM users WHERE google_id = $1',
          [googleUser.id]
        );

        if (existingUser.rows.length > 0) {
          user = existingUser.rows[0];
        } else {
          // Create new user
          const newUser = await pool.query(
            'INSERT INTO users (email, google_id, name) VALUES ($1, $2, $3) RETURNING id, email, name',
            [googleUser.email, googleUser.id, googleUser.name]
          );
          user = newUser.rows[0];
        }

        const token = generateToken(user.id, user.email);

        // Redirect to frontend with token
        return h.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
      } catch (err) {
        if (err.isBoom) throw err;
        console.error('Google OAuth error:', err);
        throw Boom.internal('Google authentication failed');
      }
    },
  },

  // Get current user
  {
    method: 'GET',
    path: '/api/me',
    handler: async (request, h) => {
      const userId = request.auth.credentials.userId;

      try {
        const result = await pool.query(
          'SELECT id, email, name FROM users WHERE id = $1',
          [userId]
        );

        if (result.rows.length === 0) {
          throw Boom.notFound('User not found');
        }

        return result.rows[0];
      } catch (err) {
        if (err.isBoom) throw err;
        throw Boom.internal('Failed to fetch user');
      }
    },
  },
];

export default authRoutes;
