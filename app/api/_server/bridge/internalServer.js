import http from "http";
import fs from "fs";
import os from "os";
import path from "path";
import app, { initializeServer } from "../app.js";
// Explicit import so Next.js standalone file tracer includes mysql2.
// Sequelize loads it dynamically (require(dialect)) which the tracer can't detect.
import "mysql2";

// Use globalThis so the singleton survives Next.js module re-evaluations
// across hot reloads and multiple worker starts in the same process.
const globalState = globalThis.__infixmartInternalServer ||
  (globalThis.__infixmartInternalServer = { promise: null });

export async function getInternalServer() {
  if (!globalState.promise) {
    globalState.promise = (async () => {
      await initializeServer();

      // Use a Unix domain socket — no TCP, no ports, no network restrictions.
      // Each worker process gets its own socket file keyed by PID.
      const socketPath = path.join(os.tmpdir(), `infixmart-${process.pid}.sock`);

      // Remove stale socket file if it exists
      try { fs.unlinkSync(socketPath); } catch {}

      const server = http.createServer(app);

      await new Promise((resolve, reject) => {
        server.once("error", (err) => {
          globalState.promise = null;
          reject(err);
        });
        server.listen(socketPath, resolve);
      });

      return { server, socketPath };
    })();
  }

  return globalState.promise;
}
