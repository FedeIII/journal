import pool from '../config/database.js';

/**
 * Data access layer for user progress data
 * Handles all database operations related to streaks and completion tracking
 */

/**
 * Get all entry dates for a user, ordered by date descending
 */
export async function getUserEntryDates(userId) {
  const result = await pool.query(
    `SELECT entry_date
     FROM journal_entries
     WHERE user_id = $1
     ORDER BY entry_date DESC`,
    [userId]
  );
  return result.rows.map(row => new Date(row.entry_date));
}

/**
 * Get user's current streak data
 */
export async function getUserStreakData(userId) {
  const result = await pool.query(
    'SELECT current_streak, best_streak, current_streak_date FROM users WHERE id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

/**
 * Update user's streak information
 */
export async function updateUserStreakData(userId, currentStreak, currentStreakDate, bestStreak) {
  await pool.query(
    `UPDATE users
     SET current_streak = $1,
         current_streak_date = $2,
         best_streak = $3
     WHERE id = $4`,
    [currentStreak, currentStreakDate, bestStreak, userId]
  );
}

/**
 * Get count of entries for a specific month
 */
export async function getMonthEntryCount(userId, year, month) {
  const result = await pool.query(
    `SELECT COUNT(*) as entry_count
     FROM journal_entries
     WHERE user_id = $1
     AND EXTRACT(YEAR FROM entry_date) = $2
     AND EXTRACT(MONTH FROM entry_date) = $3`,
    [userId, year, month]
  );
  return parseInt(result.rows[0].entry_count);
}

/**
 * Get first entry date for a user
 */
export async function getFirstEntryDate(userId) {
  const result = await pool.query(
    `SELECT MIN(entry_date) as first_entry_date,
            EXTRACT(YEAR FROM MIN(entry_date))::int as first_entry_year
     FROM journal_entries
     WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0];
}

/**
 * Get count of entries for current year
 */
export async function getCurrentYearEntryCount(userId, year) {
  const result = await pool.query(
    `SELECT COUNT(*) as entry_count
     FROM journal_entries
     WHERE user_id = $1
     AND EXTRACT(YEAR FROM entry_date) = $2`,
    [userId, year]
  );
  return parseInt(result.rows[0].entry_count);
}

/**
 * Update user's completion samples
 */
export async function updateUserCompletionSamples(userId, samples) {
  await pool.query(
    'UPDATE users SET completion_samples = $1 WHERE id = $2',
    [JSON.stringify(samples), userId]
  );
}

/**
 * Get user's completion samples
 */
export async function getUserCompletionSamples(userId) {
  const result = await pool.query(
    'SELECT completion_samples FROM users WHERE id = $1',
    [userId]
  );
  const samples = result.rows[0]?.completion_samples;
  return typeof samples === 'string' ? JSON.parse(samples) : samples || [];
}

/**
 * Get complete user progress data
 */
export async function getUserProgressData(userId) {
  const result = await pool.query(
    `SELECT current_streak, best_streak, current_streak_date, completion_samples
     FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = result.rows[0];
  const samples = typeof user.completion_samples === 'string'
    ? JSON.parse(user.completion_samples)
    : user.completion_samples || [];

  return {
    currentStreak: user.current_streak || 0,
    bestStreak: user.best_streak || 0,
    currentStreakDate: user.current_streak_date,
    completionSamples: samples
  };
}
