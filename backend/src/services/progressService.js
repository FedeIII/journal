import * as progressRepo from '../repositories/progressRepository.js';

/**
 * Business logic for user progress tracking
 * Calculates streaks, completion rates, and tiers
 */

/**
 * Calculate the current streak from entry dates
 */
export function calculateStreakFromDates(entryDates) {
  if (entryDates.length === 0) {
    return { currentStreak: 0, currentStreakDate: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const mostRecent = new Date(entryDates[0]);
  mostRecent.setHours(0, 0, 0, 0);

  // Calculate days difference between today and most recent entry
  const daysDiff = Math.floor((today - mostRecent) / (1000 * 60 * 60 * 24));

  // If the most recent entry is more than 1 day ago, streak is broken
  if (daysDiff > 1) {
    return { currentStreak: 0, currentStreakDate: null };
  }

  // Count consecutive days backwards from most recent
  let streak = 1;
  let expectedDate = new Date(mostRecent);

  for (let i = 1; i < entryDates.length; i++) {
    expectedDate.setDate(expectedDate.getDate() - 1);
    const currentEntry = new Date(entryDates[i]);
    currentEntry.setHours(0, 0, 0, 0);

    if (currentEntry.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return {
    currentStreak: streak,
    currentStreakDate: mostRecent.toISOString().split('T')[0]
  };
}

/**
 * Calculate completion rate for a specific month
 */
export function calculateMonthCompletion(entryCount, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const completion = entryCount / daysInMonth;

  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    completion: parseFloat(completion.toFixed(3)),
    entries: entryCount,
    days: daysInMonth
  };
}

/**
 * Calculate current year completion percentage
 */
export function calculateYearCompletion(entries, startDate) {
  const today = new Date();
  const days = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  const percentage = days > 0 ? (entries / days) * 100 : 0;

  return {
    percentage: parseFloat(percentage.toFixed(1)),
    entries,
    days,
    startDate: startDate.toISOString().split('T')[0]
  };
}

/**
 * Determine streak tier based on current vs best streak
 * Returns: 'low', 'mid', or 'high'
 *
 * Logic:
 * - low: currentStreak < 30% of bestStreak (or bestStreak is 0-2)
 * - mid: 30% <= currentStreak < 80% of bestStreak
 * - high: currentStreak >= 80% of bestStreak
 */
export function getStreakTier(currentStreak, bestStreak) {
  if (bestStreak <= 2) {
    // User is just starting, use absolute values
    if (currentStreak === 0) return 'low';
    if (currentStreak === 1) return 'mid';
    return 'high';
  }

  const ratio = currentStreak / bestStreak;

  if (ratio < 0.3) return 'low';
  if (ratio < 0.8) return 'mid';
  return 'high';
}

/**
 * Determine completion tier based on trending
 * Returns: 'low', 'mid', or 'high'
 *
 * Logic:
 * - Compares the 3 month samples
 * - low: decreasing trend (each month lower than previous)
 * - mid: stable or mixed trend
 * - high: increasing trend (each month higher than previous)
 */
export function getCompletionTier(samples) {
  if (!samples || samples.length < 2) {
    return 'mid'; // Not enough data, assume mid
  }

  // Samples are ordered from most recent to oldest
  // So samples[0] is current month, samples[1] is last month, etc.

  // Calculate trend: are we improving, stable, or declining?
  let improvementCount = 0;
  let declineCount = 0;

  for (let i = 0; i < samples.length - 1; i++) {
    const current = samples[i].completion;
    const previous = samples[i + 1].completion;

    const diff = current - previous;

    if (diff > 0.05) { // More than 5% improvement
      improvementCount++;
    } else if (diff < -0.05) { // More than 5% decline
      declineCount++;
    }
  }

  if (improvementCount > declineCount) return 'high';
  if (declineCount > improvementCount) return 'low';
  return 'mid';
}

/**
 * Calculate and update user's streak data
 * Should be called after saving an entry
 */
export async function updateUserStreak(userId) {
  const entryDates = await progressRepo.getUserEntryDates(userId);
  const { currentStreak, currentStreakDate } = calculateStreakFromDates(entryDates);

  // Get current best streak
  const streakData = await progressRepo.getUserStreakData(userId);
  const currentBestStreak = streakData?.best_streak || 0;
  const newBestStreak = Math.max(currentBestStreak, currentStreak);

  // Update in database
  await progressRepo.updateUserStreakData(userId, currentStreak, currentStreakDate, newBestStreak);

  return { currentStreak, bestStreak: newBestStreak };
}

/**
 * Update completion samples for a user
 * Keeps last 3 months of data
 */
export async function updateCompletionSamples(userId) {
  const today = new Date();
  const samples = [];

  // Calculate last 3 months
  for (let i = 0; i < 3; i++) {
    const targetDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;

    const entryCount = await progressRepo.getMonthEntryCount(userId, year, month);
    const sample = calculateMonthCompletion(entryCount, year, month);
    samples.push(sample);
  }

  // Store in database
  await progressRepo.updateUserCompletionSamples(userId, samples);

  return samples;
}

/**
 * Get user's complete progress stats with tiers
 */
export async function getUserProgressStats(userId) {
  // Get basic progress data
  const progressData = await progressRepo.getUserProgressData(userId);

  if (!progressData) {
    throw new Error('User not found');
  }

  // Get first entry info for year calculation
  const firstEntryInfo = await progressRepo.getFirstEntryDate(userId);

  if (!firstEntryInfo.first_entry_date) {
    // No entries yet
    return {
      currentStreak: 0,
      bestStreak: 0,
      currentStreakDate: null,
      yearCompletion: 0,
      yearEntries: 0,
      yearDays: 0,
      yearStartDate: null,
      completionSamples: [],
      streakTier: 'low',
      completionTier: 'mid',
      tierCombination: 'mid_low'
    };
  }

  const today = new Date();
  const currentYear = today.getFullYear();
  const firstEntryYear = firstEntryInfo.first_entry_year;
  const firstEntryDate = new Date(firstEntryInfo.first_entry_date);
  const isFirstYear = firstEntryYear === currentYear;

  // Determine start date for year calculation
  const startDate = isFirstYear ? firstEntryDate : new Date(currentYear, 0, 1);

  // Get current year entries
  const yearEntries = await progressRepo.getCurrentYearEntryCount(userId, currentYear);

  // Calculate year completion
  const yearCompletion = calculateYearCompletion(yearEntries, startDate);

  // Determine tiers
  const streakTier = getStreakTier(progressData.currentStreak, progressData.bestStreak);
  const completionTier = getCompletionTier(progressData.completionSamples);

  return {
    currentStreak: progressData.currentStreak,
    bestStreak: progressData.bestStreak,
    currentStreakDate: progressData.currentStreakDate,
    yearCompletion: yearCompletion.percentage,
    yearEntries: yearCompletion.entries,
    yearDays: yearCompletion.days,
    yearStartDate: yearCompletion.startDate,
    completionSamples: progressData.completionSamples,
    streakTier,
    completionTier,
    tierCombination: `${completionTier}_${streakTier}`
  };
}
