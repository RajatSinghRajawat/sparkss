/**
 * Test (Quiz) socket handlers.
 * - Join window: 5 minutes before start time until start time (user can join and see countdown).
 * - When start time is reached, server emits test:start so quiz becomes playable.
 * - When end time is reached, server emits test:expired ("Quiz expired. Next time play quiz.").
 */

const jwt = require("jsonwebtoken");
const Test = require("../models/test.model");
const Student = require("../models/student.model");

const JOIN_WINDOW_MINUTES = 5;
const ROOM_PREFIX = "test:";
const TICK_MS = 1000;

/** testId -> { startTime, endTime, startEmitted, endEmitted } */
const activeTests = new Map();

function getRoomId(testId) {
  return `${ROOM_PREFIX}${testId}`;
}

function registerTestForScheduler(testId, startTime, endTime) {
  const key = testId;
  if (activeTests.has(key)) return;
  activeTests.set(key, {
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    startEmitted: false,
    endEmitted: false,
  });
}

/**
 * Verify JWT and return student id or null.
 */
async function verifyStudentToken(token) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const student = await Student.findById(decoded.id);
    return student && student.isActive ? decoded.id : null;
  } catch {
    return null;
  }
}

/**
 * @param {import("socket.io").Server} io
 */
function setupTestSocket(io) {
  io.on("connection", (socket) => {
    let studentId = null;

    socket.on("test:join", async (payload, callback) => {
      const { testId, token } = payload || {};
      if (!testId) {
        callback?.({ success: false, reason: "invalid", message: "testId required" });
        return;
      }

      const sid = await verifyStudentToken(token || socket.handshake?.auth?.token);
      if (!sid) {
        callback?.({ success: false, reason: "unauthorized", message: "Not authorized" });
        return;
      }
      studentId = sid;

      const test = await Test.findById(testId).lean();
      if (!test || !test.isActive) {
        callback?.({ success: false, reason: "not_found", message: "Test not found" });
        return;
      }

      const now = new Date();
      const startTime = new Date(test.startTime);
      const endTime = new Date(test.endTime);
      const joinOpenAt = new Date(startTime.getTime() - JOIN_WINDOW_MINUTES * 60 * 1000);

      if (now < joinOpenAt) {
        callback?.({
          success: false,
          reason: "too_early",
          message: `You can join 5 minutes before start time.`,
          startTime: startTime.toISOString(),
        });
        return;
      }

      if (now > endTime) {
        callback?.({
          success: false,
          reason: "expired",
          message: "Quiz expired. Next time play quiz.",
        });
        return;
      }

      const roomId = getRoomId(testId);
      await socket.join(roomId);
      registerTestForScheduler(testId, startTime, endTime);

      const alreadyStarted = now >= startTime;
      callback?.({
        success: true,
        status: alreadyStarted ? "started" : "countdown",
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      });
    });

    socket.on("disconnect", () => {
      // Room is left automatically; we keep activeTests for scheduler until endTime
    });
  });

  // Scheduler: every second check active tests and emit test:start / test:expired
  setInterval(() => {
    const now = new Date();
    for (const [testId, meta] of activeTests.entries()) {
      const roomId = getRoomId(testId);
      if (now >= meta.startTime && !meta.startEmitted) {
        meta.startEmitted = true;
        io.to(roomId).emit("test:start", { testId, startTime: meta.startTime.toISOString() });
      }
      if (now > meta.endTime && !meta.endEmitted) {
        meta.endEmitted = true;
        io.to(roomId).emit("test:expired", {
          testId,
          message: "Quiz expired. Next time play quiz.",
        });
        activeTests.delete(testId);
      }
    }
  }, TICK_MS);
}

module.exports = { setupTestSocket };
