import Boom from '@hapi/boom';
import Joi from 'joi';
import pool from '../config/database.js';

// Middleware to check if user is admin
const requireAdmin = async (request, h) => {
  const userId = request.auth.credentials.userId;

  try {
    const result = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      throw Boom.forbidden('Admin access required');
    }

    return h.continue;
  } catch (err) {
    if (err.isBoom) throw err;
    console.error('Error checking admin status:', err);
    throw Boom.internal('Failed to verify admin status');
  }
};

const adminRoutes = [
  // Get all messages with stats
  {
    method: 'GET',
    path: '/api/admin/messages',
    options: {
      pre: [{ method: requireAdmin }],
    },
    handler: async (request, h) => {
      try {
        // Get all messages with aggregated stats
        const result = await pool.query(`
          SELECT
            m.id,
            m.message_text,
            m.context,
            m.tone,
            m.length,
            m.is_active,
            m.created_at,

            -- Total views
            COUNT(DISTINCT mi.id) as total_views,

            -- New user registrations
            COUNT(DISTINCT CASE
              WHEN mi.user_state = 'new_visitor' AND mi.outcome = 'registered'
              THEN mi.id
            END) as new_user_registered,

            COUNT(DISTINCT CASE
              WHEN mi.user_state = 'new_visitor' AND mi.outcome = 'left'
              THEN mi.id
            END) as new_user_left,

            -- First entry writers
            COUNT(DISTINCT CASE
              WHEN mi.user_state = 'no_entries' AND mi.outcome = 'wrote_first_entry'
              THEN mi.id
            END) as first_entry_written,

            COUNT(DISTINCT CASE
              WHEN mi.user_state = 'no_entries' AND mi.outcome = 'left'
              THEN mi.id
            END) as no_entries_left,

            -- Existing users writing entries
            COUNT(DISTINCT CASE
              WHEN mi.user_state = 'has_entries' AND mi.outcome = 'wrote_entry'
              THEN mi.id
            END) as existing_user_wrote,

            COUNT(DISTINCT CASE
              WHEN mi.user_state = 'has_entries' AND mi.outcome = 'left'
              THEN mi.id
            END) as existing_user_left

          FROM motivational_messages m
          LEFT JOIN message_interactions mi ON m.id = mi.message_id
          GROUP BY m.id, m.message_text, m.context, m.tone, m.length, m.is_active, m.created_at
          ORDER BY m.created_at DESC
        `);

        return result.rows;
      } catch (err) {
        console.error('Error fetching admin messages:', err);
        throw Boom.internal('Failed to fetch messages');
      }
    },
  },

  // Create new message
  {
    method: 'POST',
    path: '/api/admin/messages',
    options: {
      pre: [{ method: requireAdmin }],
      validate: {
        payload: Joi.object({
          messageText: Joi.string().required(),
          context: Joi.string().valid('login', 'entry', 'both').required(),
          tone: Joi.string().optional(),
          length: Joi.string().optional(),
        }),
      },
    },
    handler: async (request, h) => {
      const { messageText, context, tone, length } = request.payload;

      try {
        const result = await pool.query(
          `INSERT INTO motivational_messages (message_text, context, tone, length)
           VALUES ($1, $2, $3, $4)
           RETURNING id, message_text, context, tone, length, is_active, created_at`,
          [messageText, context, tone || null, length || null]
        );

        return result.rows[0];
      } catch (err) {
        console.error('Error creating message:', err);
        throw Boom.internal('Failed to create message');
      }
    },
  },

  // Update message
  {
    method: 'PUT',
    path: '/api/admin/messages/{id}',
    options: {
      pre: [{ method: requireAdmin }],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
        payload: Joi.object({
          messageText: Joi.string().optional(),
          context: Joi.string().valid('login', 'entry', 'both').optional(),
          tone: Joi.string().optional(),
          length: Joi.string().optional(),
          isActive: Joi.boolean().optional(),
        }),
      },
    },
    handler: async (request, h) => {
      const { id } = request.params;
      const { messageText, context, tone, length, isActive } = request.payload;

      try {
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (messageText !== undefined) {
          updates.push(`message_text = $${paramCount++}`);
          values.push(messageText);
        }
        if (context !== undefined) {
          updates.push(`context = $${paramCount++}`);
          values.push(context);
        }
        if (tone !== undefined) {
          updates.push(`tone = $${paramCount++}`);
          values.push(tone);
        }
        if (length !== undefined) {
          updates.push(`length = $${paramCount++}`);
          values.push(length);
        }
        if (isActive !== undefined) {
          updates.push(`is_active = $${paramCount++}`);
          values.push(isActive);
        }

        if (updates.length === 0) {
          throw Boom.badRequest('No fields to update');
        }

        values.push(id);

        const result = await pool.query(
          `UPDATE motivational_messages
           SET ${updates.join(', ')}
           WHERE id = $${paramCount}
           RETURNING id, message_text, context, tone, length, is_active, created_at`,
          values
        );

        if (result.rows.length === 0) {
          throw Boom.notFound('Message not found');
        }

        return result.rows[0];
      } catch (err) {
        if (err.isBoom) throw err;
        console.error('Error updating message:', err);
        throw Boom.internal('Failed to update message');
      }
    },
  },

  // Delete message
  {
    method: 'DELETE',
    path: '/api/admin/messages/{id}',
    options: {
      pre: [{ method: requireAdmin }],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { id } = request.params;

      try {
        const result = await pool.query(
          'DELETE FROM motivational_messages WHERE id = $1 RETURNING id',
          [id]
        );

        if (result.rows.length === 0) {
          throw Boom.notFound('Message not found');
        }

        return { success: true };
      } catch (err) {
        if (err.isBoom) throw err;
        console.error('Error deleting message:', err);
        throw Boom.internal('Failed to delete message');
      }
    },
  },

  // Get detailed stats for a specific message
  {
    method: 'GET',
    path: '/api/admin/messages/{id}/stats',
    options: {
      pre: [{ method: requireAdmin }],
      validate: {
        params: Joi.object({
          id: Joi.number().integer().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const { id } = request.params;

      try {
        const result = await pool.query(
          `SELECT
            context,
            user_state,
            outcome,
            COUNT(*) as count
           FROM message_interactions
           WHERE message_id = $1
           GROUP BY context, user_state, outcome
           ORDER BY context, user_state, outcome`,
          [id]
        );

        return result.rows;
      } catch (err) {
        console.error('Error fetching message stats:', err);
        throw Boom.internal('Failed to fetch stats');
      }
    },
  },
];

export default adminRoutes;
