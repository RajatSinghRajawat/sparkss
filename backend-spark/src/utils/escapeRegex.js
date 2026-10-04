/**
 * Escape user input before building a RegExp / $regex from it.
 * Raw input made searches like "c++" or "(" throw "Nothing to repeat" → 500,
 * and let callers inject arbitrary (and slow) patterns.
 */
const escapeRegex = (value) => String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

module.exports = { escapeRegex };
