/**
 * Push notification service (Firebase Cloud Messaging).
 *
 * The student app registers raw FCM device tokens (react-native-push-notification)
 * which are stored in StudentFcmToken. This service sends pushes to those tokens
 * via firebase-admin.
 *
 * Configuration (any ONE of the following enables real sending):
 *   - FIREBASE_SERVICE_ACCOUNT  → the service-account JSON as a single-line string
 *   - GOOGLE_APPLICATION_CREDENTIALS → path to the service-account JSON file
 *
 * If firebase-admin is not installed or no credentials are provided, the service
 * safely no-ops (logs a warning) so the rest of the API keeps working.
 */

const StudentFcmToken = require("../models/studentFcmToken.model");
const TestNotificationSubscription = require("../models/testNotificationSubscription.model");

let messaging = null;
let initTried = false;

function getMessaging() {
  if (initTried) return messaging;
  initTried = true;
  try {
    // Lazy require so a missing package never crashes the server.
    const admin = require("firebase-admin");

    if (!admin.apps.length) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (raw) {
        const serviceAccount = JSON.parse(raw);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      } else {
        console.warn(
          "⚠️  [notifications] No FCM credentials set (FIREBASE_SERVICE_ACCOUNT / GOOGLE_APPLICATION_CREDENTIALS). Push sending disabled."
        );
        return null;
      }
    }

    messaging = admin.messaging();
    console.log("✅ [notifications] Firebase messaging initialized");
  } catch (err) {
    console.warn(
      "⚠️  [notifications] firebase-admin not available — push sending disabled:",
      err.message
    );
    messaging = null;
  }
  return messaging;
}

/**
 * Send a push to a list of raw FCM tokens. Cleans up tokens FCM reports invalid.
 * Safe no-op when messaging is not configured.
 */
async function sendToTokens(tokens, { title, body, data = {} }) {
  const unique = [...new Set((tokens || []).filter(Boolean))];
  if (unique.length === 0) return { sent: 0, failed: 0 };

  const msg = getMessaging();
  if (!msg) {
    console.log(
      `📣 [notifications] (disabled) would send "${title}" to ${unique.length} device(s)`
    );
    return { sent: 0, failed: 0, disabled: true };
  }

  // Data payload values must be strings for FCM.
  const stringData = Object.fromEntries(
    Object.entries({ title, message: body, ...data }).map(([k, v]) => [
      k,
      String(v),
    ])
  );

  let sent = 0;
  let failed = 0;
  const invalidTokens = [];

  // sendEachForMulticast handles up to 500 tokens per call.
  for (let i = 0; i < unique.length; i += 500) {
    const batch = unique.slice(i, i + 500);
    try {
      const res = await msg.sendEachForMulticast({
        tokens: batch,
        notification: { title, body },
        data: stringData,
        android: { priority: "high" },
      });
      sent += res.successCount;
      failed += res.failureCount;
      res.responses.forEach((r, idx) => {
        const code = r.error?.code;
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(batch[idx]);
        }
      });
    } catch (err) {
      failed += batch.length;
      console.error("❌ [notifications] send batch failed:", err.message);
    }
  }

  // Prune dead tokens so we don't keep retrying them.
  if (invalidTokens.length > 0) {
    await StudentFcmToken.deleteMany({ fcmToken: { $in: invalidTokens } }).catch(
      () => {}
    );
  }

  console.log(
    `📣 [notifications] "${title}" → sent ${sent}, failed ${failed}`
  );
  return { sent, failed };
}

/** Send a push to specific students (by id) — gathers their device tokens. */
async function sendToStudents(studentIds, payload) {
  const ids = [...new Set((studentIds || []).map(String))];
  if (ids.length === 0) return { sent: 0, failed: 0 };
  const tokenDocs = await StudentFcmToken.find({ student: { $in: ids } })
    .select("fcmToken")
    .lean();
  return sendToTokens(
    tokenDocs.map((d) => d.fcmToken),
    payload
  );
}

/**
 * Notify every student subscribed to a test's notifications.
 * `payload` = { title, body, data }. The testId is always injected into data.
 */
async function notifyTestSubscribers(testId, payload) {
  if (!testId) return { sent: 0, failed: 0 };
  const subs = await TestNotificationSubscription.find({ test: testId })
    .select("student")
    .lean();
  if (subs.length === 0) return { sent: 0, failed: 0 };
  return sendToStudents(
    subs.map((s) => s.student),
    {
      ...payload,
      data: { type: "test", testId: String(testId), ...(payload.data || {}) },
    }
  );
}

module.exports = {
  sendToTokens,
  sendToStudents,
  notifyTestSubscribers,
};
