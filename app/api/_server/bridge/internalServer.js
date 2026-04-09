import { Readable } from "stream";
import app, { initializeServer } from "../app.js";

const globalState = globalThis.__infixmartBridge ||
  (globalThis.__infixmartBridge = { ready: null });

async function ensureReady() {
  if (!globalState.ready) {
    globalState.ready = initializeServer().catch((err) => {
      globalState.ready = null;
      throw err;
    });
  }
  return globalState.ready;
}

/**
 * Call the Express app directly in-process — no HTTP, no TCP, no sockets.
 * Works in any hosting environment including Hostinger standalone mode.
 */
export async function callExpressInProcess(request, targetPath) {
  await ensureReady();

  const url = new URL(request.url);
  const isBodyless = ["GET", "HEAD"].includes(request.method);
  const bodyBuf = isBodyless ? null : Buffer.from(await request.arrayBuffer());

  return new Promise((resolve, reject) => {
    // ── Mock IncomingMessage (readable stream + Express props) ────────────
    const req = new Readable({ read() {} });
    req.method = request.method;
    req.url = targetPath + url.search;
    const headers = { ...Object.fromEntries(request.headers.entries()), host: "localhost" };
    // Strip origin — this is an in-process call, not a real cross-origin request.
    // Keeping it causes Express CORS to reject requests if FRONTEND_URL env var
    // doesn't exactly match the browser's origin header.
    delete headers["origin"];
    req.headers = headers;
    req.socket = { remoteAddress: "127.0.0.1", encrypted: false, destroy() {} };
    req.connection = req.socket;
    const forwarded = request.headers.get("x-forwarded-for") || "127.0.0.1";
    req.ip = String(forwarded).split(",")[0].trim() || "127.0.0.1";

    // Push body AFTER Express attaches its listeners
    setImmediate(() => {
      if (bodyBuf) req.push(bodyBuf);
      req.push(null);
    });

    // ── Mock ServerResponse ───────────────────────────────────────────────
    let statusCode = 200;
    const resHeaders = {};
    const chunks = [];
    let done = false;

    function finish(body) {
      if (done) return;
      done = true;
      const headers = new Headers();
      for (const [k, v] of Object.entries(resHeaders)) {
        const vals = Array.isArray(v) ? v : [v];
        vals.forEach((val) => val != null && headers.append(k, String(val)));
      }
      resolve(new Response(body && body.length ? body : null, { status: statusCode, headers }));
    }

    const res = {
      statusCode: 200,
      headersSent: false,
      finished: false,
      locals: {},

      status(code) { statusCode = code; this.statusCode = code; return this; },
      sendStatus(code) { statusCode = code; this.end(String(code)); return this; },
      setHeader(k, v) { resHeaders[k.toLowerCase()] = v; return this; },
      getHeader(k) { return resHeaders[k.toLowerCase()]; },
      removeHeader(k) { delete resHeaders[k.toLowerCase()]; },

      write(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        return true;
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        this.finished = true;
        this.headersSent = true;
        finish(Buffer.concat(chunks));
      },
      json(data) {
        resHeaders["content-type"] = "application/json; charset=utf-8";
        this.end(JSON.stringify(data));
      },
      send(data) {
        if (data && typeof data === "object") {
          resHeaders["content-type"] = "application/json; charset=utf-8";
          this.end(JSON.stringify(data));
        } else {
          this.end(data);
        }
      },
      redirect(urlOrCode, maybeUrl) {
        const location = typeof urlOrCode === "string" ? urlOrCode : maybeUrl;
        const code = typeof urlOrCode === "number" ? urlOrCode : 302;
        resolve(Response.redirect(location, code));
        done = true;
      },
      cookie(name, value, options = {}) {
        let c = `${name}=${encodeURIComponent(value ?? "")}`;
        if (options.maxAge != null) c += `; Max-Age=${options.maxAge}`;
        if (options.expires) c += `; Expires=${options.expires.toUTCString()}`;
        if (options.path) c += `; Path=${options.path}`;
        if (options.domain) c += `; Domain=${options.domain}`;
        if (options.secure) c += "; Secure";
        if (options.httpOnly) c += "; HttpOnly";
        if (options.sameSite) c += `; SameSite=${options.sameSite}`;
        const prev = resHeaders["set-cookie"];
        resHeaders["set-cookie"] = prev
          ? (Array.isArray(prev) ? [...prev, c] : [prev, c])
          : c;
        return this;
      },
      clearCookie(name, options = {}) {
        return this.cookie(name, "", { ...options, maxAge: 0, expires: new Date(0) });
      },

      // EventEmitter stubs required by Express internals
      on() { return this; },
      once() { return this; },
      emit() { return this; },
      addListener() { return this; },
      removeListener() { return this; },
      removeAllListeners() { return this; },
    };

    try {
      app(req, res, (err) => {
        if (err) {
          const s = err.status || err.statusCode || 500;
          resolve(Response.json({ message: err.message, error: true, success: false }, { status: s }));
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}
