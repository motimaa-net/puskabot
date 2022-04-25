/**
 * @description Converts date to epoch time string
 * @param {Date} timestamp
 * @returns {string}
 */
export const epochConverter = (timestamp: Date) =>
  (timestamp.getTime() / 1000).toFixed(0);

/**
 * @param {Date} date
 * @returns {string}
 */
export const daysAgo = (date: Date) => {
  const now = new Date();
  // Get total seconds between the times
  const diff = Math.abs(now.getTime() - date.getTime());
  let delta = Math.abs(diff) / 1000;

  // Calculate (and subtract) whole days
  const days = Math.floor(delta / 86400);
  delta -= days * 86400;

  // Calculate (and subtract) whole hours
  const hours = Math.floor(delta / 3600) % 24;
  delta -= hours * 3600;

  // Calculate (and subtract) whole minutes
  const minutes = Math.floor(delta / 60) % 60;
  delta -= minutes * 60;

  return `${days}d, ${hours}h, ${minutes}m ${date < now ? "sitten" : ""}`;
};
