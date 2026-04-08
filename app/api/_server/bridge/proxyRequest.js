import http from "node:http";
import { getInternalServer } from "./internalServer.js";

const BODYLESS_METHODS = new Set(["GET", "HEAD"]);

export async function proxyLegacyRequest(request, targetPath) {
  const { socketPath } = await getInternalServer();

  const incomingUrl = new URL(request.url);
  const urlPath = targetPath + incomingUrl.search;

  const reqHeaders = {};
  for (const [k, v] of request.headers.entries()) {
    if (k === "host" || k === "connection" || k === "content-length") continue;
    reqHeaders[k] = v;
  }

  const body = BODYLESS_METHODS.has(request.method)
    ? null
    : Buffer.from(await request.arrayBuffer());

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath,          // Unix socket — bypasses TCP entirely
        path: urlPath,
        method: request.method,
        headers: reqHeaders,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          const headers = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (Array.isArray(v)) v.forEach((val) => headers.append(k, val));
            else if (v != null) headers.append(k, String(v));
          }
          resolve(new Response(buffer, { status: res.statusCode, headers }));
        });
        res.on("error", reject);
      }
    );

    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}
