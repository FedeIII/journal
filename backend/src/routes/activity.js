import Boom from '@hapi/boom';
import * as progressService from '../services/progressService.js';
import pool from '../config/database.js';

const activityRoutes = [
  // Get activity summary for specific user (Fede III)
  {
    method: 'GET',
    path: '/api/activity/summary',
    options: {
      auth: false, // No auth required for activity summary
    },
    handler: async (request, h) => {
      try {
        // Get Fede III's user ID
        const userResult = await pool.query(
          'SELECT id FROM users WHERE email = $1',
          ['fedelll@gmail.com']
        );

        if (userResult.rows.length === 0) {
          throw Boom.notFound('User not found');
        }

        const userId = userResult.rows[0].id;

        // Get user's progress stats
        const stats = await progressService.getUserProgressStats(userId);

        // Get total user count
        const userCountResult = await pool.query('SELECT COUNT(*) as count FROM users');
        const userCount = parseInt(userCountResult.rows[0].count);

        return {
          currentStreak: stats.currentStreak,
          yearCompletion: stats.yearCompletion,
          userCount,
        };
      } catch (err) {
        if (Boom.isBoom(err)) throw err; // keep the 404 for a missing user
        console.error('Error fetching activity summary:', err);
        throw Boom.internal('Failed to fetch activity summary');
      }
    },
  },
];

export default activityRoutes;
