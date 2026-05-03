# InfixMart Production DB Migration — 2026-04

This migration is the SQL companion to the **Top Production Risks** code changes (OrderItems, idempotency, refund/cancel, account lockout, webhook events).

Run **every block in order** in phpMyAdmin on Hostinger (or via `mysql` CLI). All statements are idempotent — safe to re-run.

> Image storage tables (`Products.images`, `Categories.images`, blog/homepage image columns, upload paths) are **NOT touched** by this migration.

---

## 0. Pre-flight: take a backup

Before running anything below, take a fresh backup of the production database from Hostinger's *MySQL Databases → Export*.

---

## 1. `OrderItems` table

The application code already inserts into `OrderItems` on every order create, but the table was never declared in `db/schema.sql`. Adding it formally.

```sql
CREATE TABLE IF NOT EXISTS `OrderItems` (
  `id`        INT           NOT NULL AUTO_INCREMENT,
  `orderId`   INT           NOT NULL,
  `productId` INT           NOT NULL,
  `name`      VARCHAR(255)  NOT NULL,
  `image`     VARCHAR(500)      NULL,
  `price`     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `qty`       INT           NOT NULL DEFAULT 1,
  `createdAt` DATETIME      NOT NULL,
  `updatedAt` DATETIME      NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_orderId`   (`orderId`),
  KEY `idx_order_items_productId` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Optional: backfill existing orders

If `OrderItems` was newly created and you want historical orders rebuilt as rows from the JSON blob in `Orders.items`, run this once:

```sql
INSERT INTO OrderItems (orderId, productId, name, image, price, qty, createdAt, updatedAt)
SELECT
  o.id                                                                AS orderId,
  CAST(JSON_UNQUOTE(JSON_EXTRACT(j.value, '$.productId')) AS UNSIGNED) AS productId,
  JSON_UNQUOTE(JSON_EXTRACT(j.value, '$.name'))                         AS name,
  JSON_UNQUOTE(JSON_EXTRACT(j.value, '$.image'))                        AS image,
  CAST(JSON_UNQUOTE(JSON_EXTRACT(j.value, '$.price')) AS DECIMAL(10,2)) AS price,
  CAST(JSON_UNQUOTE(JSON_EXTRACT(j.value, '$.qty'))   AS UNSIGNED)      AS qty,
  o.createdAt,
  o.updatedAt
FROM Orders o,
     JSON_TABLE(o.items, '$[*]' COLUMNS (value JSON PATH '$')) j
WHERE NOT EXISTS (
  SELECT 1 FROM OrderItems oi WHERE oi.orderId = o.id
);
```

This is **optional** — skip if you don't need historical rows yet. Future orders are already double-written.

---

## 2. Idempotency keys for orders + wallet topups

Prevents the same checkout/payment/topup from being committed twice on retries.

```sql
ALTER TABLE `Orders`
  ADD COLUMN IF NOT EXISTS `idempotencyKey` VARCHAR(100) NULL AFTER `paymentResult`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_orders_idempotencyKey`
  ON `Orders` (`idempotencyKey`);

ALTER TABLE `WalletTopups`
  ADD COLUMN IF NOT EXISTS `idempotencyKey` VARCHAR(100) NULL AFTER `amount`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_wallet_topups_idempotencyKey`
  ON `WalletTopups` (`idempotencyKey`);
```

> `NULL` is allowed because legacy rows have no key. The `UNIQUE` index allows multiple `NULL`s in MySQL — only non-NULL keys must be unique.

---

## 3. `WebhookEvents` table (Razorpay webhook deduping)

```sql
CREATE TABLE IF NOT EXISTS `WebhookEvents` (
  `id`           INT           NOT NULL AUTO_INCREMENT,
  `provider`     VARCHAR(30)   NOT NULL DEFAULT 'razorpay',
  `eventId`      VARCHAR(100)  NOT NULL,
  `type`         VARCHAR(80)   NOT NULL,
  `entityId`     VARCHAR(100)      NULL,
  `payload`      JSON              NULL,
  `status`       ENUM('received','processed','failed') NOT NULL DEFAULT 'received',
  `error`        TEXT              NULL,
  `receivedAt`   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processedAt`  DATETIME          NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_webhook_provider_eventId` (`provider`, `eventId`),
  KEY `idx_webhook_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 4. Order cancellation columns

```sql
ALTER TABLE `Orders`
  ADD COLUMN IF NOT EXISTS `cancelledAt`  DATETIME     NULL AFTER `courierName`,
  ADD COLUMN IF NOT EXISTS `cancelReason` VARCHAR(500) NULL AFTER `cancelledAt`,
  ADD COLUMN IF NOT EXISTS `cancelledBy`  VARCHAR(20)  NULL AFTER `cancelReason`;
```

> `cancelledBy` is `'user'`, `'admin'`, or `'system'`.

---

## 5. `Refunds` table

```sql
CREATE TABLE IF NOT EXISTS `Refunds` (
  `id`               INT           NOT NULL AUTO_INCREMENT,
  `orderId`          INT           NOT NULL,
  `userId`           INT           NOT NULL,
  `amount`           DECIMAL(10,2) NOT NULL,
  `currency`         VARCHAR(10)   NOT NULL DEFAULT 'INR',
  `razorpayPaymentId` VARCHAR(100)     NULL,
  `razorpayRefundId` VARCHAR(100)      NULL,
  `status`           ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `reason`           VARCHAR(500)      NULL,
  `requestedBy`      VARCHAR(20)   NOT NULL DEFAULT 'admin',
  `requestedById`    INT               NULL,
  `note`             TEXT              NULL,
  `failureReason`    TEXT              NULL,
  `createdAt`        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processedAt`      DATETIME          NULL,
  PRIMARY KEY (`id`),
  KEY `idx_refunds_orderId` (`orderId`),
  KEY `idx_refunds_userId` (`userId`),
  KEY `idx_refunds_status` (`status`),
  UNIQUE KEY `uq_refunds_razorpayRefundId` (`razorpayRefundId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 6. Account lockout columns on `Users`

```sql
ALTER TABLE `Users`
  ADD COLUMN IF NOT EXISTS `failedLoginCount`  INT      NOT NULL DEFAULT 0  AFTER `last_login_date`,
  ADD COLUMN IF NOT EXISTS `lockedUntil`       DATETIME     NULL            AFTER `failedLoginCount`,
  ADD COLUMN IF NOT EXISTS `lastFailedLoginAt` DATETIME     NULL            AFTER `lockedUntil`;
```

---

## 6b. Catalog & Search (Section D — added in same release)

### Products: status + view/purchase counters + reorder threshold

```sql
ALTER TABLE `Products`
  ADD COLUMN IF NOT EXISTS `status`           ENUM('draft','active','archived') NOT NULL DEFAULT 'active' AFTER `sku`,
  ADD COLUMN IF NOT EXISTS `viewCount`        INT NOT NULL DEFAULT 0 AFTER `saleEndsAt`,
  ADD COLUMN IF NOT EXISTS `purchaseCount`    INT NOT NULL DEFAULT 0 AFTER `viewCount`,
  ADD COLUMN IF NOT EXISTS `reorderThreshold` INT NOT NULL DEFAULT 5 AFTER `purchaseCount`;
```

### Products: SKU uniqueness

> ⚠️ **Run the duplicate check first.** If you have existing duplicate SKUs in production, the unique-index creation will fail. Resolve them in admin first.

```sql
-- Diagnostic: any non-NULL SKU appearing more than once?
SELECT sku, COUNT(*) AS dupes
  FROM Products
 WHERE sku IS NOT NULL
 GROUP BY sku
HAVING COUNT(*) > 1;
```

If the result is empty, apply the unique index:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS `uq_products_sku` ON `Products` (`sku`);
```

### Products: FULLTEXT search index

```sql
ALTER TABLE `Products`
  ADD FULLTEXT INDEX IF NOT EXISTS `ft_products_search` (`name`, `brand`, `description`, `sku`);
```

> Requires InnoDB. MariaDB and MySQL ≥ 5.6 both support it. If your shared MySQL instance has `innodb_ft_min_token_size` set to 4, queries shorter than 4 chars won't match — the application falls back to LIKE for ≤ 2-char queries automatically.

### Products: helper indexes for common filters

```sql
CREATE INDEX IF NOT EXISTS `idx_products_status` ON `Products` (`status`);
CREATE INDEX IF NOT EXISTS `idx_products_catId`  ON `Products` (`catId`);
CREATE INDEX IF NOT EXISTS `idx_products_brand`  ON `Products` (`brand`);
```

### Verification

```sql
SHOW COLUMNS FROM Products LIKE 'status';
SHOW COLUMNS FROM Products LIKE 'viewCount';
SHOW COLUMNS FROM Products LIKE 'purchaseCount';
SHOW COLUMNS FROM Products LIKE 'reorderThreshold';
SHOW INDEX  FROM Products WHERE Key_name = 'uq_products_sku';
SHOW INDEX  FROM Products WHERE Key_name = 'ft_products_search';

-- Quick test: FULLTEXT search returns relevance-ranked rows
SELECT id, name, MATCH(name, brand, description, sku) AGAINST('test' IN NATURAL LANGUAGE MODE) AS score
  FROM Products
 WHERE MATCH(name, brand, description, sku) AGAINST('test' IN NATURAL LANGUAGE MODE)
 ORDER BY score DESC
 LIMIT 5;
```

---

## 6c. Analytics & Growth (Section F)

### `SearchLogs` table — top-searches + zero-result tracking

```sql
CREATE TABLE IF NOT EXISTS `SearchLogs` (
  `id`           INT          NOT NULL AUTO_INCREMENT,
  `query`        VARCHAR(255) NOT NULL,
  `queryNorm`    VARCHAR(255) NOT NULL,
  `resultCount`  INT          NOT NULL DEFAULT 0,
  `userId`       INT              NULL,
  `ip`           VARCHAR(64)      NULL,
  `createdAt`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_search_queryNorm` (`queryNorm`),
  KEY `idx_search_createdAt` (`createdAt`),
  KEY `idx_search_zero`       (`resultCount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Verification

```sql
SHOW TABLES LIKE 'SearchLogs';

-- Top searches in last 30 days
SELECT queryNorm, COUNT(*) searches, AVG(resultCount) avgResults
  FROM SearchLogs
 WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
 GROUP BY queryNorm
 ORDER BY searches DESC
 LIMIT 10;
```

---

## 6d. Compliance & Invoicing (Section G)

### `CounterSequences` table — atomic counters (invoice numbers, future use)

```sql
CREATE TABLE IF NOT EXISTS `CounterSequences` (
  `name`      VARCHAR(64) NOT NULL,
  `period`    VARCHAR(32) NOT NULL,
  `value`     INT         NOT NULL DEFAULT 0,
  `updatedAt` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`, `period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Orders: invoice number column

```sql
ALTER TABLE `Orders`
  ADD COLUMN IF NOT EXISTS `invoiceNumber` VARCHAR(40) NULL AFTER `idempotencyKey`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_orders_invoiceNumber` ON `Orders` (`invoiceNumber`);
```

### Users: soft-delete column

```sql
ALTER TABLE `Users`
  ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME NULL AFTER `lastFailedLoginAt`;
```

### Optional: backfill invoice numbers for existing orders

If you want every historical order to have an invoice number too, run this **once** after the schema changes are applied. It allocates numbers in chronological order and persists them.

```sql
-- Pure-SQL retro fill: groups by Indian fiscal year, then numbers within each.
SET @prev_fy := '';
SET @seq := 0;

UPDATE Orders o
JOIN (
  SELECT id,
         CONCAT(
           IF(MONTH(createdAt) >= 4, YEAR(createdAt),     YEAR(createdAt) - 1),
           '-',
           LPAD(MOD(IF(MONTH(createdAt) >= 4, YEAR(createdAt) + 1, YEAR(createdAt)), 100), 2, '0')
         ) AS fy
    FROM Orders
   WHERE invoiceNumber IS NULL
   ORDER BY createdAt ASC, id ASC
) ranked ON ranked.id = o.id
SET o.invoiceNumber =
  CONCAT(
    'INV/',
    ranked.fy,
    '/',
    LPAD(
      (CASE WHEN @prev_fy = ranked.fy THEN @seq := @seq + 1 ELSE @seq := 1 END),
      5, '0'
    )
  ),
  o.updatedAt = CURRENT_TIMESTAMP,
  @prev_fy := ranked.fy
WHERE o.invoiceNumber IS NULL;

-- Sync the CounterSequences table so future orders pick up where retro fill ended.
INSERT INTO CounterSequences (name, period, value)
SELECT 'invoice', SUBSTRING_INDEX(SUBSTRING_INDEX(invoiceNumber, '/', 2), '/', -1) AS period,
       MAX(CAST(SUBSTRING_INDEX(invoiceNumber, '/', -1) AS UNSIGNED)) AS value
  FROM Orders
 WHERE invoiceNumber IS NOT NULL
 GROUP BY period
ON DUPLICATE KEY UPDATE value = GREATEST(value, VALUES(value));
```

### Recommended StoreSettings keys

For the tax-invoice page to display seller details + classify CGST/SGST vs IGST, set these in admin → settings (or insert manually):

```sql
INSERT INTO StoreSettings (`key`, `value`, `updatedAt`) VALUES
  ('gst_seller_name',    'InfixMart Wholesale Pvt. Ltd.', NOW()),
  ('gst_seller_address', 'Your registered office address',  NOW()),
  ('gst_seller_gstin',   '23ABCDE1234F1Z5',                 NOW()),
  ('gst_seller_state',   'Madhya Pradesh',                  NOW()),
  ('gst_seller_email',   'support@yourdomain.com',          NOW()),
  ('gst_seller_phone',   '+91 88490 47148',                 NOW()),
  ('gst_default_hsn',    '9999',                            NOW()),
  ('gst_percent',        '18',                              NOW())
ON DUPLICATE KEY UPDATE value = VALUES(value), updatedAt = NOW();
```

### Verification

```sql
SHOW TABLES LIKE 'CounterSequences';
SHOW COLUMNS FROM Orders LIKE 'invoiceNumber';
SHOW COLUMNS FROM Users  LIKE 'deletedAt';

-- Confirm counter is in sync after retro fill
SELECT * FROM CounterSequences WHERE name = 'invoice' ORDER BY period DESC;

-- Spot-check a recent invoice
SELECT id, invoiceNumber, status, totalPrice, createdAt
  FROM Orders
 WHERE invoiceNumber IS NOT NULL
 ORDER BY id DESC
 LIMIT 5;
```

---

## 7. Verification queries

After running everything above, run these to verify:

```sql
-- 1. Tables exist
SHOW TABLES LIKE 'OrderItems';
SHOW TABLES LIKE 'Refunds';
SHOW TABLES LIKE 'WebhookEvents';

-- 2. New columns exist
SHOW COLUMNS FROM Orders LIKE 'idempotencyKey';
SHOW COLUMNS FROM Orders LIKE 'cancelledAt';
SHOW COLUMNS FROM Orders LIKE 'cancelledBy';
SHOW COLUMNS FROM WalletTopups LIKE 'idempotencyKey';
SHOW COLUMNS FROM Users LIKE 'failedLoginCount';
SHOW COLUMNS FROM Users LIKE 'lockedUntil';

-- 3. Spot-check one recent order has matching OrderItems rows
SELECT o.id, JSON_LENGTH(o.items) AS jsonItems,
       (SELECT COUNT(*) FROM OrderItems oi WHERE oi.orderId = o.id) AS rowItems
FROM Orders o
ORDER BY o.id DESC
LIMIT 5;
```

For the final query, `jsonItems` and `rowItems` should match for every order created **after** the `OrderItems` table existed in production. Older orders may show `rowItems = 0` until you run the optional backfill in section 1.

---

## 8. Rollback

If anything goes wrong, the additive ALTERs are safe to leave. To roll back the new tables you can drop them — but only do this if you've also reverted the application code:

```sql
-- DANGEROUS: only run after reverting application code
-- DROP TABLE IF EXISTS Refunds;
-- DROP TABLE IF EXISTS WebhookEvents;
-- DROP TABLE IF EXISTS OrderItems;
```

---

## Environment variables to add on Hostinger

The application code expects these new env vars (see `.env.example`):

| Variable | Purpose | Required? |
|---|---|---|
| `RAZORPAY_WEBHOOK_SECRET` | Verifies the webhook signature from Razorpay dashboard | Yes, before going live |
| `SENTRY_DSN` | Server + client error reporting (leave blank to disable) | Optional |
| `SENTRY_ENVIRONMENT` | `production`/`staging` tag for Sentry events | Optional |
| `LOGIN_LOCKOUT_THRESHOLD` | Failed attempts before lockout (default `5`) | Optional |
| `LOGIN_LOCKOUT_WINDOW_MIN` | Lockout duration in minutes (default `15`) | Optional |

After adding, restart the Node app on Hostinger.

---

## Razorpay webhook setup (manual, in Razorpay dashboard)

1. Razorpay dashboard → **Settings → Webhooks → Add New Webhook**.
2. URL: `https://YOUR_DOMAIN/api/payment/webhook`
3. Active events: `payment.captured`, `payment.failed`, `refund.created`, `refund.processed`, `refund.failed`.
4. Set a strong **webhook secret** and paste it into `RAZORPAY_WEBHOOK_SECRET` env on Hostinger.
5. Save and click **Send Test** to confirm the endpoint returns `200`.
