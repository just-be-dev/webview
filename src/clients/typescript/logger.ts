/**
 * A minimal leveled logger, configured via the `LOG_LEVEL` environment
 * variable (`trace | debug | info | warn | error | fatal`).
 *
 * @module
 */

export enum Level {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  CRITICAL = 5,
}

let currentLevel = Level.INFO;

/** Sets the global log level from a `LOG_LEVEL`-style string. */
export function setLogLevel(raw: string | undefined): void {
  switch (raw) {
    case "trace":
      currentLevel = Level.TRACE;
      break;
    case "debug":
      currentLevel = Level.DEBUG;
      break;
    case "info":
      currentLevel = Level.INFO;
      break;
    case "warn":
      currentLevel = Level.WARN;
      break;
    case "error":
      currentLevel = Level.ERROR;
      break;
    case "fatal":
      currentLevel = Level.CRITICAL;
      break;
    default:
      currentLevel = Level.INFO;
  }
}

function log(level: Level, label: string, message: string, fields?: unknown) {
  if (level < currentLevel) return;
  const line = `${label} webview: ${message}`;
  if (fields !== undefined) {
    console.error(line, fields);
  } else {
    console.error(line);
  }
}

/** Logs a message at the TRACE level. */
export const trace = (message: string, fields?: unknown): void =>
  log(Level.TRACE, "TRACE", message, fields);

/** Logs a message at the DEBUG level. */
export const debug = (message: string, fields?: unknown): void =>
  log(Level.DEBUG, "DEBUG", message, fields);

/** Logs a message at the WARN level. */
export const warn = (message: string, fields?: unknown): void =>
  log(Level.WARN, " WARN", message, fields);

/** Logs a message at the ERROR level. */
export const error = (message: string, fields?: unknown): void =>
  log(Level.ERROR, "ERROR", message, fields);
