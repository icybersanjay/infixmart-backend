// Zero-dep structured logger. Emits one JSON line per event so anything
// downstream (Hostinger journal, pm2-logrotate, fluentbit, Loki) can index it.
// Same on-the-wire format pino uses. We avoid pino itself to keep the
// dependency surface small and to stay edge-runtime-safe.

const LEVELS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 };

function envLevel() {
  const raw = String(process.env.LOG_LEVEL || "info").toLowerCase();
  return LEVELS[raw] ?? LEVELS.info;
}

let activeLevel = envLevel();

function emit(level, payload) {
  if (LEVELS[level] < activeLevel) return;
  const line = {
    level,
    time: new Date().toISOString(),
    ...payload,
  };
  // Single JSON line; never throws even if payload contains circular refs
  // (we strip them defensively).
  let serialized;
  try {
    serialized = JSON.stringify(line);
  } catch {
    serialized = JSON.stringify({ ...line, msg: "[unserializable payload]" });
  }
  // Use stderr for warn/error/fatal so they're easy to grep.
  if (LEVELS[level] >= LEVELS.warn) {
    console.error(serialized);
  } else {
    console.log(serialized);
  }
}

function logger(bindings = {}) {
  return {
    info: (obj, msg) => emit("info", buildPayload(bindings, obj, msg)),
    warn: (obj, msg) => emit("warn", buildPayload(bindings, obj, msg)),
    error: (obj, msg) => emit("error", buildPayload(bindings, obj, msg)),
    debug: (obj, msg) => emit("debug", buildPayload(bindings, obj, msg)),
    child: (extra) => logger({ ...bindings, ...extra }),
  };
}

function buildPayload(bindings, obj, msg) {
  // Support both `log.info({ foo: 1 }, "message")` and `log.info("message")`.
  if (typeof obj === "string" && msg === undefined) {
    return { ...bindings, msg: obj };
  }
  if (obj && typeof obj === "object") {
    if (obj instanceof Error) {
      return {
        ...bindings,
        msg: msg || obj.message,
        err: { name: obj.name, message: obj.message, stack: obj.stack },
      };
    }
    return { ...bindings, ...obj, ...(msg ? { msg } : {}) };
  }
  return { ...bindings, msg };
}

const baseLogger = logger({ app: "infixmart" });

export { baseLogger as log };
export default baseLogger;
