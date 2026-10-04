/**
 * Test notification scheduler.
 *
 * Runs on a fixed interval and sends pushes to a test's notification subscribers:
 *   1. "Test about to start" — fires within REMINDER_LEAD_MS before startTime.
 *   2. "Results available"   — fires once the test's endTime has passed.
 *
 * Each push is sent at most once per test (guarded by startReminderSentAt /
 * resultsNotifiedAt on the Test document).
 */

const Test = require("../models/test.model");
const { notifyTestSubscribers } = require("../services/notification.service");

const CHECK_INTERVAL_MS = 60 * 1000; // run every minute
const REMINDER_LEAD_MS = 15 * 60 * 1000; // remind 15 min before start

async function sendStartReminders(now) {
  const windowEnd = new Date(now.getTime() + REMINDER_LEAD_MS);
  // Tests starting within the next REMINDER_LEAD_MS that haven't been reminded.
  const tests = await Test.find({
    isActive: true,
    startReminderSentAt: null,
    startTime: { $gt: now, $lte: windowEnd },
  })
    .select("_id title")
    .lean();

  for (const test of tests) {
    // Claim the reminder atomically to avoid double-sends across instances.
    const claimed = await Test.findOneAndUpdate(
      { _id: test._id, startReminderSentAt: null },
      { $set: { startReminderSentAt: now } }
    ).lean();
    if (!claimed) continue;
    await notifyTestSubscribers(test._id, {
      title: "Test starting soon ⏰",
      body: `"${test.title}" is about to start. Get ready!`,
      data: { event: "test_starting_soon" },
    }).catch(() => {});
  }
}

async function sendResultsAvailable(now) {
  const tests = await Test.find({
    isActive: true,
    resultsNotifiedAt: null,
    endTime: { $ne: null, $lte: now },
  })
    .select("_id title")
    .lean();

  for (const test of tests) {
    const claimed = await Test.findOneAndUpdate(
      { _id: test._id, resultsNotifiedAt: null },
      { $set: { resultsNotifiedAt: now } }
    ).lean();
    if (!claimed) continue;
    await notifyTestSubscribers(test._id, {
      title: "Results are out 📊",
      body: `Your results for "${test.title}" are now available. Tap to view.`,
      data: { event: "test_results_available" },
    }).catch(() => {});
  }
}

async function tick() {
  try {
    const now = new Date();
    await sendStartReminders(now);
    await sendResultsAvailable(now);
  } catch (err) {
    console.error("❌ [testReminder] tick failed:", err.message);
  }
}

let timer = null;
function startTestReminderJob() {
  if (timer) return;
  // Kick once shortly after boot, then on the interval.
  timer = setInterval(tick, CHECK_INTERVAL_MS);
  setTimeout(tick, 5000);
  console.log("⏰ [testReminder] scheduler started (every 60s)");
}

module.exports = { startTestReminderJob };
