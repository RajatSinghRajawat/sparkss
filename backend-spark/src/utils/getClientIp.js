/**
 * Get client IP from request (handles proxy via X-Forwarded-For)
 */
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first && first.trim()) return first.trim();
  }
  return req.ip || req.connection?.remoteAddress || "";
}

module.exports = { getClientIp };
