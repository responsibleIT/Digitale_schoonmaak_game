// src/utils/logger.ts
type Level = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const COLORS = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};

const envLevel = (process.env.LOG_LEVEL as Level) || (process.env.NODE_ENV === "production" ? "info" : "debug");

function fmtTs(d = new Date()) {
  // ISO zonder ms voor compacte logs
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function color(level: Level, msg: string) {
  if (process.env.NO_COLOR === "1") return msg;
  const c = level === "debug" ? COLORS.gray : level === "info" ? COLORS.blue : level === "warn" ? COLORS.yellow : COLORS.red;
  return c + msg + COLORS.reset;
}

function baseLog(namespace: string | undefined, level: Level, ...args: unknown[]) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[envLevel]) return;
  const ns = namespace ? `[${namespace}]` : "";
  const prefix = `${fmtTs()} ${ns} ${level.toUpperCase()}:`;
  // Kleurtje alleen op het level-label
  const printable = [color(level, prefix), ...args];
  // eslint-disable-next-line no-console
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(...printable);
}

export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  child: (ns: string) => Logger;
}

/**
 * Maak een logger met optionele namespace. Respecteert LOG_LEVEL en NODE_ENV.
 * Voorbeeld:
 *   const log = createLogger("server");
 *   log.info("Started on", port);
 */
export function createLogger(namespace?: string): Logger {
  return {
    debug: (...a) => baseLog(namespace, "debug", ...a),
    info:  (...a) => baseLog(namespace, "info",  ...a),
    warn:  (...a) => baseLog(namespace, "warn",  ...a),
    error: (...a) => baseLog(namespace, "error", ...a),
    child: (ns: string) => createLogger(namespace ? `${namespace}:${ns}` : ns),
  };
}

// Standaard logger zonder namespace (backwards compat)
export const log = createLogger();
