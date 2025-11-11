import Boom from '@hapi/boom';
import * as progressService from '../services/progressService.js';
import * as motivationalService from '../services/motivationalService.js';

const progressRoutes = [
  // Get user's progress stats with motivational messages
  {
    method: 'GET',
    path: '/api/progress/stats',
    handler: async (request, h) => {
      const userId = request.auth.credentials.userId;

      try {
        const stats = await progressService.getUserProgressStats(userId);

        // Generate motivational messages
        const mainMessage = motivationalService.getMotivationalMessage(stats);
        const streakStatus = motivationalService.getStreakStatusMessage(stats);
        const yearCompletionStatus = motivationalService.getYearCompletionMessage(stats);

        return {
          ...stats,
          messages: {
            main: mainMessage,
            streakStatus,
            yearCompletionStatus
          }
        };
      } catch (err) {
        console.error('Error fetching progress stats:', err);
        throw Boom.internal('Failed to fetch progress stats');
      }
    },
  },

  // Get contextual motivational message
  {
    method: 'GET',
    path: '/api/progress/message',
    handler: async (request, h) => {
      const userId = request.auth.credentials.userId;
      const context = request.query.context || 'entry_page';

      try {
        const stats = await progressService.getUserProgressStats(userId);
        const message = motivationalService.getContextualMessage(stats, context);

        return {
          message,
          context,
          stats: {
            currentStreak: stats.currentStreak,
            bestStreak: stats.bestStreak,
            yearCompletion: stats.yearCompletion,
            tierCombination: stats.tierCombination
          }
        };
      } catch (err) {
        console.error('Error fetching motivational message:', err);
        throw Boom.internal('Failed to fetch message');
      }
    },
  },
];

export default progressRoutes;
