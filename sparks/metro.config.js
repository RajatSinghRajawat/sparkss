const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

/**
 * Keep native build output and shipped binaries out of Metro's file map.
 *
 * By default Metro indexes everything under the project root, including
 * ios/Pods, the Gradle build directories and the ~99MB APK sitting next to
 * package.json — none of which the bundler ever reads. On a machine with
 * limited RAM that extra map was enough to push Metro past its 2GB V8 heap
 * and kill the dev server mid-session.
 *
 * Patterns accept either path separator so they work on Windows and POSIX.
 */
config.resolver.blockList = [
  /[\\/]android[\\/]build[\\/].*/,
  /[\\/]android[\\/]\.gradle[\\/].*/,
  /[\\/]android[\\/]app[\\/]build[\\/].*/,
  /[\\/]android[\\/]\.cxx[\\/].*/,
  /[\\/]ios[\\/]build[\\/].*/,
  /[\\/]ios[\\/]Pods[\\/].*/,
  /[\\/]ios[\\/].*\.xcworkspace[\\/].*/,
  /[\\/]\.expo[\\/]web[\\/]cache[\\/].*/,
  /\.apk$/,
  /\.aab$/,
  /\.ipa$/,
  /\.hprof$/,
  // JVM crash dumps from failed Android builds land in the repo root.
  /hs_err_pid\d+\.log$/,
  /replay_pid\d+\.log$/,
];

module.exports = config;
