/**
 * Service for generating personalized motivational messages
 * based on user's progress stats
 */

/**
 * Message templates for each tier combination
 * Each array contains multiple messages to choose from randomly
 */
const MESSAGE_TEMPLATES = {
  // LOW COMPLETION, LOW STREAK
  low_low: [
    (stats) => `Start fresh today! Your best streak is ${stats.bestStreak} days—let's build toward that again, one entry at a time.`,
    (stats) => `Every journey starts with a single step. Write today and begin a new streak!`,
    (stats) => `You've done ${stats.yearEntries} entries this year. Keep the momentum going—today is a new opportunity!`,
    (stats) => `Rebuilding takes courage. Start your streak today and watch it grow!`,
  ],

  // LOW COMPLETION, MID STREAK
  low_mid: [
    (stats) => `You're at ${stats.currentStreak} days! Keep this streak alive while working toward your ${stats.yearCompletion.toFixed(0)}% year goal.`,
    (stats) => `${stats.currentStreak} days and counting! You're ${Math.abs(stats.currentStreak - stats.bestStreak)} days from matching your best streak of ${stats.bestStreak}.`,
    (stats) => `You're building consistency with ${stats.currentStreak} straight days. Don't break the chain!`,
    (stats) => `Your current ${stats.currentStreak}-day streak shows real commitment. Keep it going!`,
  ],

  // LOW COMPLETION, HIGH STREAK
  low_high: [
    (stats) => stats.currentStreak === stats.bestStreak
      ? `🔥 ${stats.currentStreak} days! You're at your all-time best! Can you push even further today?`
      : `Incredible! ${stats.currentStreak} days strong! You're just ${stats.bestStreak - stats.currentStreak} away from your record of ${stats.bestStreak}.`,
    (stats) => `Amazing streak of ${stats.currentStreak} days! This consistency will transform your year completion rate.`,
    (stats) => `You're on fire with ${stats.currentStreak} consecutive days! This is the momentum you need.`,
    (stats) => `${stats.currentStreak} days in a row! Your dedication is showing. Keep this energy going!`,
  ],

  // MID COMPLETION, LOW STREAK
  mid_low: [
    (stats) => `You're at ${stats.yearCompletion.toFixed(0)}% for the year. Start a new streak today to push that number higher!`,
    (stats) => `Your year is ${stats.yearCompletion.toFixed(0)}% complete with entries. A new streak starting today could make a big difference!`,
    (stats) => `You've proven you can maintain ${stats.yearCompletion.toFixed(0)}% completion. Now let's build a streak to match!`,
    (stats) => `${stats.yearEntries} entries this year shows dedication. Time to build that streak back up!`,
  ],

  // MID COMPLETION, MID STREAK
  mid_mid: [
    (stats) => `Solid progress: ${stats.currentStreak} day streak and ${stats.yearCompletion.toFixed(0)}% year completion. You're in a good rhythm!`,
    (stats) => `You're ${stats.bestStreak - stats.currentStreak} days from your best streak of ${stats.bestStreak}. Keep this ${stats.currentStreak}-day run going!`,
    (stats) => `${stats.currentStreak} days strong! You're maintaining good momentum at ${stats.yearCompletion.toFixed(0)}% for the year.`,
    (stats) => `Steady and consistent: ${stats.currentStreak} days in a row. Your ${stats.yearCompletion.toFixed(0)}% completion shows it's working!`,
  ],

  // MID COMPLETION, HIGH STREAK
  mid_high: [
    (stats) => stats.currentStreak === stats.bestStreak
      ? `🌟 ${stats.currentStreak} days! You've matched your best! One more entry sets a new personal record!`
      : `Impressive ${stats.currentStreak}-day streak! Just ${stats.bestStreak - stats.currentStreak} more to beat your record of ${stats.bestStreak}!`,
    (stats) => `${stats.currentStreak} consecutive days! This streak is propelling your year to ${stats.yearCompletion.toFixed(0)}% completion!`,
    (stats) => `You're crushing it with ${stats.currentStreak} days! This momentum could take you past your ${stats.yearCompletion.toFixed(0)}% year rate.`,
    (stats) => `${stats.currentStreak} days running! You're in the zone and it shows in your ${stats.yearCompletion.toFixed(0)}% year completion.`,
  ],

  // HIGH COMPLETION, LOW STREAK
  high_low: [
    (stats) => `Outstanding ${stats.yearCompletion.toFixed(0)}% year completion! Now let's rebuild that streak to match your consistency.`,
    (stats) => `You've maintained ${stats.yearCompletion.toFixed(0)}% completion this year. Start today to rebuild your streak!`,
    (stats) => `${stats.yearEntries} entries in ${stats.yearDays} days is impressive! Let's get that streak growing again.`,
    (stats) => `Your ${stats.yearCompletion.toFixed(0)}% rate proves your commitment. A new streak starts right now!`,
  ],

  // HIGH COMPLETION, MID STREAK
  high_mid: [
    (stats) => `Excellent work: ${stats.yearCompletion.toFixed(0)}% for the year and a ${stats.currentStreak}-day streak! You're ${stats.bestStreak - stats.currentStreak} from your best.`,
    (stats) => `${stats.currentStreak} days building! Your ${stats.yearCompletion.toFixed(0)}% year rate shows what you're capable of.`,
    (stats) => `Strong ${stats.currentStreak}-day streak supporting your impressive ${stats.yearCompletion.toFixed(0)}% year completion!`,
    (stats) => `You're at ${stats.currentStreak} days with ${stats.yearCompletion.toFixed(0)}% year completion. Keep the excellence going!`,
  ],

  // HIGH COMPLETION, HIGH STREAK
  high_high: [
    (stats) => stats.currentStreak === stats.bestStreak
      ? `🚀 ${stats.currentStreak} days and ${stats.yearCompletion.toFixed(0)}% year completion! You're at peak performance! Break your own record today!`
      : `Phenomenal! ${stats.currentStreak} days and ${stats.yearCompletion.toFixed(0)}% for the year! Just ${stats.bestStreak - stats.currentStreak} from your record!`,
    (stats) => `Exceptional consistency: ${stats.currentStreak} consecutive days at ${stats.yearCompletion.toFixed(0)}% year completion. You're unstoppable!`,
    (stats) => `${stats.currentStreak} days running with ${stats.yearCompletion.toFixed(0)}% year rate! This is the rhythm of success!`,
    (stats) => `Peak performance: ${stats.currentStreak}-day streak and ${stats.yearCompletion.toFixed(0)}% yearly! You're setting the standard!`,
  ],
};

/**
 * Get a random motivational message based on user's progress stats
 */
export function getMotivationalMessage(stats) {
  const tierCombination = stats.tierCombination;
  const templates = MESSAGE_TEMPLATES[tierCombination];

  if (!templates || templates.length === 0) {
    // Fallback message
    return `You have ${stats.yearEntries} entries this year. Keep writing!`;
  }

  // Select random template
  const randomIndex = Math.floor(Math.random() * templates.length);
  const template = templates[randomIndex];

  // Generate message with user's actual stats
  return template(stats);
}

/**
 * Get context-specific message for different locations in the app
 */
export function getContextualMessage(stats, context) {
  const baseMessage = getMotivationalMessage(stats);

  // Add context-specific prefixes or suffixes if needed
  switch (context) {
    case 'entry_page':
      // For the entry page, keep it focused on writing
      return baseMessage;

    case 'calendar':
      // For calendar view, emphasize visualization
      return baseMessage;

    case 'navbar_stats':
      // For navbar stats widget, keep it concise
      return baseMessage;

    default:
      return baseMessage;
  }
}

/**
 * Get streak status message (separate from main motivational message)
 */
export function getStreakStatusMessage(stats) {
  if (stats.currentStreak === 0) {
    return `No active streak. Start one today!`;
  }

  if (stats.currentStreak === 1) {
    return `1 day streak. Keep it going!`;
  }

  if (stats.currentStreak === stats.bestStreak) {
    return `${stats.currentStreak} day streak - Your best! 🔥`;
  }

  if (stats.currentStreak >= stats.bestStreak * 0.8) {
    const diff = stats.bestStreak - stats.currentStreak;
    return `${stats.currentStreak} day streak. ${diff} more to match your best!`;
  }

  return `${stats.currentStreak} day streak`;
}

/**
 * Get year completion status message
 */
export function getYearCompletionMessage(stats) {
  const percentage = stats.yearCompletion.toFixed(1);
  return `${percentage}% (${stats.yearEntries}/${stats.yearDays} days)`;
}
