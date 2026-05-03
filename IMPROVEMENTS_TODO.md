# InfixMart — Improvements TODO

Living checklist of pending fixes and improvements. Tick `[x]` when shipped, then move the entry out of this file. Completed history lives in git — no need to keep it here.

Effort key: **S** = under an hour, **M** = a few hours, **L** = a day or more.
Tag key: **[B5]** legacy exit · **[C1]** tests · **[C2]** TypeScript migration · **[C3]** variants · **[C4]** search · **[D]** ops/observability · **[E]** growth features.

---

## Pending backlog (5 items)

### TypeScript migration ratchet

- [ ] **(L) [C2]** Components, leaf-up. **Server side is 100% TypeScript** (all 25 repos, all 30 services, api/db/auth helpers, all 36 route handlers). **Phases 1 + 2 shipped:** all 6 hooks + 6 utils + 5 contexts in `app/_legacy/{hooks,utils,context}/` are `.ts`/`.tsx`, plus 14 leaf components and the 5 UI primitives (Spinner, Stars, Modal, SlideOver, DropdownMenu). Contexts now expose typed `useCart() / useWishlist() / useCompare() / useSettings() / useRecentlyViewed()`. **~137 .jsx remain** — the bigger stateful components (Header, Footer, ProductItem, ProductDetails, CartPanel, etc.) and per-route page client components in `app/(store)` + `app/admin`.

### Frontend exit-`_legacy/` (opt-in cleanup)

- [ ] **(L) [B5]** Lift the rest of `app/_legacy/` (Pages: Blog, Compare, ForgotPassword, Home client, Login, MyList, NotFound, OrderSuccess, PDP client, PLP client, Referral, Register, Verify; ~50 components; 5 contexts; 6 hooks; 6 utils; LegacyProviders). The folder name carries no runtime cost — only lift things when you're already touching them for another reason (RSC conversion, TS migration, perf). Don't do a "clean out `_legacy/`" sprint for its own sake.

### Observability + ops

- [ ] **(M) [D]** Lighthouse CI on PRs — fail under LCP 2.5s mobile / CLS 0.1. Needs CI infra first.

### Test coverage

- [ ] **(L) [C1]** Playwright smoke for full purchase: home → PDP → cart → checkout → COD success. Needs Playwright dep + browser binaries; defer until the repo has CI to run it on.

### One-shot post-cutover migration

- [ ] **(S) [C3]** Drop legacy `Products.size` / `productRam` / `productWeight` columns and the legacy chip selectors on the PDP — only after admins have migrated their catalogs to the first-class `ProductVariants` table and a cutover window has passed. Pure deletion.

---

## How to schedule the cron endpoints

Three cron endpoints exist, all protected by either an admin session OR `Authorization: Bearer $CRON_SECRET`. Set `CRON_SECRET` in `.env` to a long random string, then point any hosted cron service at the URL. Manual admin runs: hit the URL while logged in to admin — no secret needed.

```
# Daily 9am IST
GET  https://infixmart.com/api/admin/cron/review-reminders?daysAfter=7&limit=50
Header: Authorization: Bearer <CRON_SECRET>

# Hourly
GET  https://infixmart.com/api/admin/cron/back-in-stock?limit=100
Header: Authorization: Bearer <CRON_SECRET>

# Every 4 hours — email first, escalates to SMS 24h after the email
GET  https://infixmart.com/api/admin/cron/abandoned-cart?minIdle=60&smsAfter=24&limit=100
Header: Authorization: Bearer <CRON_SECRET>
```

---

_Updated: 2026-05-02_
