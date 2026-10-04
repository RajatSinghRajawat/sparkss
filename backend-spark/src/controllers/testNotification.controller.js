const Test = require("../models/test.model");
const TestNotificationSubscription = require("../models/testNotificationSubscription.model");

/**
 * @desc    Toggle the notification subscription (bell) for a test
 * @route   POST /api/students/tests/:testId/notify
 * @access  Private (Student)
 */
const toggleTestNotification = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { testId } = req.params;

    const test = await Test.findById(testId).select("_id isActive").lean();
    if (!test || !test.isActive) {
      return res.status(404).json({ success: false, message: "Test not found" });
    }

    const existing = await TestNotificationSubscription.findOne({
      student: studentId,
      test: testId,
    });

    let subscribed;
    if (existing) {
      await existing.deleteOne();
      subscribed = false;
    } else {
      await TestNotificationSubscription.create({
        student: studentId,
        test: testId,
      });
      subscribed = true;
    }

    return res.status(200).json({
      success: true,
      message: subscribed
        ? "You'll be notified about this test"
        : "Notifications turned off for this test",
      data: { testId, subscribed },
    });
  } catch (error) {
    // Duplicate key (race): treat as already subscribed
    if (error.code === 11000) {
      return res.status(200).json({
        success: true,
        message: "You'll be notified about this test",
        data: { testId: req.params.testId, subscribed: true },
      });
    }
    console.error("❌ toggleTestNotification error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update notification setting",
    });
  }
};

/**
 * @desc    Get notification subscription status for a test
 * @route   GET /api/students/tests/:testId/notify
 * @access  Private (Student)
 */
const getTestNotificationStatus = async (req, res) => {
  try {
    const studentId = req.user.id;
    const { testId } = req.params;
    const existing = await TestNotificationSubscription.exists({
      student: studentId,
      test: testId,
    });
    return res.status(200).json({
      success: true,
      message: "Notification status fetched",
      data: { testId, subscribed: Boolean(existing) },
    });
  } catch (error) {
    console.error("❌ getTestNotificationStatus error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification status",
    });
  }
};

module.exports = { toggleTestNotification, getTestNotificationStatus };
