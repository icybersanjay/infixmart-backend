// JS re-export shim. The implementation lives in mysql.ts; this file exists
// only so the existing `from "../db/mysql.js"` imports keep resolving under
// Vitest, which doesn't do bundler-style .js → .ts mapping. Once every caller
// has been converted to .ts (and imports the .js or extensionless path), this
// shim can be deleted.
export { getMysqlPool, query, execute, withTransaction } from "./mysql.ts";
