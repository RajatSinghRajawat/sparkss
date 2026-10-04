const mongoose = require("mongoose");

/**
 * TestNotificationSubscription – a student opted in to receive notifications
 * for a specific test (bell turned ON). Only subscribers receive that test's
 * push notifications (start reminder, teacher updates, results, edits).
 *
 * One record per (student, test) — unique compound index.
 */
const testNotificationSubscriptionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
      index: true,
    },
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Test",
      required: [true, "Test is required"],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One subscription per student per test
testNotificationSubscriptionSchema.index(
  { student: 1, test: 1 },
  { unique: true }
);

const TestNotificationSubscription = mongoose.model(
  "TestNotificationSubscription",
  testNotificationSubscriptionSchema
);

module.exports = TestNotificationSubscription;
