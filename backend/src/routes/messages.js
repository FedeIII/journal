import Boom from '@hapi/boom';
import Joi from 'joi';
import pool from '../config/database.js';

const messagesRoutes = [
  // Get random motivational message
  {
    method: 'GET',
    path: '/api/messages/random',
    options: {
      auth: false, // Allow unauthenticated access for login page
      validate: {
        query: Joi.object({
          context: Joi.string().valid('login', 'entry', 'register').required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { context } = request.query;

      try {
        // Get random message that matches context or is marked as 'both'
        const result = await pool.query(
          `SELECT id, message_text, context, tone, length
           FROM motivational_messages
           WHERE is_active = true AND (context = $1 OR context = 'both')
           ORDER BY RANDOM()
           LIMIT 1`,
          [context]
        );

        if (result.rows.length === 0) {
          // Fallback message if none exist
          return {
            id: null,
            message_text: 'Start writing your journal today.',
            context: 'both',
            tone: 'simple',
            length: 'short',
          };
        }

        return result.rows[0];
      } catch (err) {
        console.error('Error fetching random message:', err);
        throw Boom.internal('Failed to fetch message');
      }
    },
  },

  // Track message interaction
  {
    method: 'POST',
    path: '/api/messages/track',
    options: {
      auth: false, // Allow tracking before login
      validate: {
        payload: Joi.object({
          messageId: Joi.number().integer().required(),
          sessionId: Joi.string().required(),
          userId: Joi.number().integer().allow(null).optional(),
          context: Joi.string().valid('login', 'register', 'entry').required(),
          userState: Joi.string()
            .valid('new_visitor', 'no_entries', 'has_entries')
            .required(),
          outcome: Joi.string()
            .valid('registered', 'wrote_first_entry', 'wrote_entry', 'left')
            .allow(null)
            .optional(),
        }),
      },
    },
    handler: async (request, h) => {
      const { messageId, sessionId, userId, context, userState, outcome } =
        request.payload;

      try {
        // Check if interaction already exists for this session and message
        const existing = await pool.query(
          `SELECT id FROM message_interactions
           WHERE session_id = $1 AND message_id = $2 AND context = $3`,
          [sessionId, messageId, context]
        );

        if (existing.rows.length > 0) {
          // Update existing interaction with outcome
          if (outcome) {
            await pool.query(
              `UPDATE message_interactions
               SET outcome = $1, completed_at = CURRENT_TIMESTAMP, user_id = $2
               WHERE id = $3`,
              [outcome, userId || null, existing.rows[0].id]
            );
          }
          return { success: true, interaction_id: existing.rows[0].id };
        } else {
          // Create new interaction
          const result = await pool.query(
            `INSERT INTO message_interactions
             (message_id, user_id, session_id, context, user_state, outcome, completed_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
              messageId,
              userId || null,
              sessionId,
              context,
              userState,
              outcome || null,
              outcome ? new Date() : null,
            ]
          );

          return { success: true, interaction_id: result.rows[0].id };
        }
      } catch (err) {
        console.error('Error tracking message interaction:', err);
        throw Boom.internal('Failed to track interaction');
      }
    },
  },

  // Get user's entry count (helper endpoint)
  {
    method: 'GET',
    path: '/api/messages/user-state',
    handler: async (request, h) => {
      const userId = request.auth.credentials.userId;

      try {
        const result = await pool.query(
          'SELECT COUNT(*) as count FROM journal_entries WHERE user_id = $1',
          [userId]
        );

        const entryCount = parseInt(result.rows[0].count);
        const userState =
          entryCount === 0 ? 'no_entries' : 'has_entries';

        return { userState, entryCount };
      } catch (err) {
        console.error('Error fetching user state:', err);
        throw Boom.internal('Failed to fetch user state');
      }
    },
  },
];

export default messagesRoutes;
