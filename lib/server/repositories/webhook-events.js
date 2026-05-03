// JS re-export shim — see webhook-events.ts for the real implementation.
export {
  recordWebhookEvent,
  markWebhookProcessed,
  markWebhookFailed,
  findWebhookEvent,
} from "./webhook-events.ts";
