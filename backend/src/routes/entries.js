import Boom from '@hapi/boom';
import Joi from 'joi';
import pool from '../config/database.js';
import * as progressService from '../services/progressService.js';

const entriesRoutes = [
  // Create or update entry for a specific date
  {
    method: 'POST',
    path: '/api/entries',
    options: {
      validate: {
        payload: Joi.object({
          date: Joi.date().iso().required(),
          content: Joi.object().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const userId = request.auth.credentials.userId;
      const { date, content } = request.payload;

      try {
        const result = await pool.query(
          `INSERT INTO journal_entries (user_id, entry_date, content)
           VALUES ($1, $2, $3)
           ON CONFLICT (user_id, entry_date)
           DO UPDATE SET content = $3, updated_at = CURRENT_TIMESTAMP
           RETURNING id, user_id, entry_date, content, created_at, updated_at`,
          [userId, date, JSON.stringify(content)]
        );

        // Update user streak and completion samples in background
        // Don't wait for it to complete to keep response fast
        progressService.updateUserStreak(userId).catch(err =>
          console.error('Error updating streak:', err)
        );
        progressService.updateCompletionSamples(userId).catch(err =>
          console.error('Error updating completion samples:', err)
        );

        return result.rows[0];
      } catch (err) {
        console.error('Error saving entry:', err);
        throw Boom.internal('Failed to save entry');
      }
    },
  },

  // Get entry for a specific date
  {
    method: 'GET',
    path: '/api/entries/{date}',
    options: {
      validate: {
        params: Joi.object({
          date: Joi.date().iso().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const userId = request.auth.credentials.userId;
      const { date } = request.params;

      try {
        const result = await pool.query(
          'SELECT id, user_id, entry_date, content, created_at, updated_at FROM journal_entries WHERE user_id = $1 AND entry_date = $2',
          [userId, date]
        );

        if (result.rows.length === 0) {
          return null;
        }

        return result.rows[0];
      } catch (err) {
        console.error('Error fetching entry:', err);
        throw Boom.internal('Failed to fetch entry');
      }
    },
  },

  // Get entries for a date range (for calendar views)
  {
    method: 'GET',
    path: '/api/entries/range/{startDate}/{endDate}',
    options: {
      validate: {
        params: Joi.object({
          startDate: Joi.date().iso().required(),
          endDate: Joi.date().iso().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const userId = request.auth.credentials.userId;
      const { startDate, endDate } = request.params;

      try {
        const result = await pool.query(
          `SELECT id, user_id, entry_date, content, created_at, updated_at
           FROM journal_entries
           WHERE user_id = $1 AND entry_date >= $2 AND entry_date <= $3
           ORDER BY entry_date ASC`,
          [userId, startDate, endDate]
        );

        return result.rows;
      } catch (err) {
        console.error('Error fetching entries:', err);
        throw Boom.internal('Failed to fetch entries');
      }
    },
  },

  // Get all entries for a specific day of month across all years
  {
    method: 'GET',
    path: '/api/entries/day/{month}/{day}',
    options: {
      validate: {
        params: Joi.object({
          month: Joi.number().integer().min(1).max(12).required(),
          day: Joi.number().integer().min(1).max(31).required(),
        }),
      },
    },
    handler: async (request, h) => {
      const userId = request.auth.credentials.userId;
      const { month, day } = request.params;

      try {
        const result = await pool.query(
          `SELECT id, user_id, entry_date, content, created_at, updated_at
           FROM journal_entries
           WHERE user_id = $1
           AND EXTRACT(MONTH FROM entry_date) = $2
           AND EXTRACT(DAY FROM entry_date) = $3
           ORDER BY entry_date ASC`,
          [userId, month, day]
        );

        return result.rows;
      } catch (err) {
        console.error('Error fetching day entries:', err);
        throw Boom.internal('Failed to fetch day entries');
      }
    },
  },

  // Delete entry
  {
    method: 'DELETE',
    path: '/api/entries/{date}',
    options: {
      validate: {
        params: Joi.object({
          date: Joi.date().iso().required(),
        }),
      },
    },
    handler: async (request, h) => {
      const userId = request.auth.credentials.userId;
      const { date } = request.params;

      try {
        const result = await pool.query(
          'DELETE FROM journal_entries WHERE user_id = $1 AND entry_date = $2 RETURNING id',
          [userId, date]
        );

        if (result.rows.length === 0) {
          throw Boom.notFound('Entry not found');
        }

        return { success: true };
      } catch (err) {
        if (err.isBoom) throw err;
        console.error('Error deleting entry:', err);
        throw Boom.internal('Failed to delete entry');
      }
    },
  },
];

export default entriesRoutes;
