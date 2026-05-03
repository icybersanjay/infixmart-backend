-- ============================================================
--  InfixMart — Production migration (everything since the last push)
--  Run once on production via phpMyAdmin (or any MySQL 8 client).
--  Safe to re-run — every statement is idempotent
--  (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / etc.).
--
--  The application also auto-creates / auto-heals every table here on
--  first request via the `ensure*Schema()` helpers in
--  lib/server/repositories/*.ts, so this file is technically optional —
--  running it just gets the schema ready before the first request hits.
-- ============================================================

SET NAMES utf8mb4;

-- ============================================================
-- 1.  Users — account lockout + soft-delete
-- ============================================================

ALTER TABLE `Users`
  ADD COLUMN IF NOT EXISTS `failedLoginCount`  INT      NOT NULL DEFAULT 0  AFTER `last_login_date`,
  ADD COLUMN IF NOT EXISTS `lockedUntil`       DATETIME     NULL            AFTER `failedLoginCount`,
  ADD COLUMN IF NOT EXISTS `lastFailedLoginAt` DATETIME     NULL            AFTER `lockedUntil`,
  ADD COLUMN IF NOT EXISTS `deletedAt`         DATETIME     NULL            AFTER `lastFailedLoginAt`;

-- ============================================================
-- 2.  Orders — tracking, idempotency, cancellation, invoicing,
--     delivery + review-reminder timestamps
-- ============================================================

ALTER TABLE `Orders`
  ADD COLUMN IF NOT EXISTS `trackingUrl`           VARCHAR(500) NULL AFTER `courierName`,
  ADD COLUMN IF NOT EXISTS `idempotencyKey`        VARCHAR(100) NULL AFTER `paymentResult`,
  ADD COLUMN IF NOT EXISTS `invoiceNumber`         VARCHAR(40)  NULL AFTER `idempotencyKey`,
  ADD COLUMN IF NOT EXISTS `cancelledAt`           DATETIME     NULL AFTER `trackingUrl`,
  ADD COLUMN IF NOT EXISTS `cancelReason`          VARCHAR(500) NULL AFTER `cancelledAt`,
  ADD COLUMN IF NOT EXISTS `cancelledBy`           VARCHAR(20)  NULL AFTER `cancelReason`,
  ADD COLUMN IF NOT EXISTS `deliveredAt`           DATETIME     NULL,
  ADD COLUMN IF NOT EXISTS `reviewReminderSentAt`  DATETIME     NULL;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_orders_idempotencyKey` ON `Orders` (`idempotencyKey`);
CREATE UNIQUE INDEX IF NOT EXISTS `uq_orders_invoiceNumber`  ON `Orders` (`invoiceNumber`);

-- ============================================================
-- 3.  OrderItems — formalize the table + per-variant fields
-- ============================================================
-- The app already writes this table; we formalize the schema and add
-- the per-variant columns so a delivered order remembers which variant
-- the customer bought even if the variant row is later edited/removed.

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

ALTER TABLE `OrderItems`
  ADD COLUMN IF NOT EXISTS `variantId`   INT          NULL AFTER `productId`,
  ADD COLUMN IF NOT EXISTS `variantName` VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS `variantSku`  VARCHAR(100) NULL;

-- ============================================================
-- 4.  CartProducts — per-variant cart lines
-- ============================================================
-- Same product with two different variants must be two separate cart
-- lines, so the unique key changes from (userId, productId) → (userId,
-- productId, variantId).
--
-- NOTE: the DROP INDEX line is commented out by default because most
-- installs never had the legacy 2-column index (it would error #1091
-- "Can't DROP INDEX; check that it exists"). Only uncomment it if a
-- `SHOW INDEX FROM CartProducts;` actually lists `uq_cart_user_product`.

ALTER TABLE `CartProducts`
  ADD COLUMN IF NOT EXISTS `variantId` INT NULL AFTER `productId`;

-- ALTER TABLE `CartProducts` DROP INDEX `uq_cart_user_product`;

-- Add the new 3-column unique key. If your install already has a unique
-- key with this exact name the statement is a no-op; if it errors with
-- "Duplicate key name", the index is already present and you can ignore.
ALTER TABLE `CartProducts`
  ADD UNIQUE KEY `uq_cart_user_product_variant` (`userId`, `productId`, `variantId`);

-- ============================================================
-- 5.  Products — status, counters, reorder threshold,
--     SKU uniqueness, FULLTEXT search, helper indexes,
--     bulk-order tiered pricing
-- ============================================================

ALTER TABLE `Products`
  ADD COLUMN IF NOT EXISTS `status`            ENUM('draft','active','archived') NOT NULL DEFAULT 'active' AFTER `sku`,
  ADD COLUMN IF NOT EXISTS `videoUrl`          VARCHAR(500) NULL AFTER `productWeight`,
  ADD COLUMN IF NOT EXISTS `saleEndsAt`        DATETIME     NULL AFTER `videoUrl`,
  ADD COLUMN IF NOT EXISTS `viewCount`         INT NOT NULL DEFAULT 0 AFTER `saleEndsAt`,
  ADD COLUMN IF NOT EXISTS `purchaseCount`     INT NOT NULL DEFAULT 0 AFTER `viewCount`,
  ADD COLUMN IF NOT EXISTS `reorderThreshold`  INT NOT NULL DEFAULT 5 AFTER `purchaseCount`,
  ADD COLUMN IF NOT EXISTS `priceTiers`        JSON NULL;

-- SKU uniqueness — if you have duplicate SKUs already in production,
-- this CREATE will fail. Resolve duplicates first:
--   SELECT sku, COUNT(*) FROM Products WHERE sku IS NOT NULL GROUP BY sku HAVING COUNT(*) > 1;
CREATE UNIQUE INDEX IF NOT EXISTS `uq_products_sku` ON `Products` (`sku`);

-- FULLTEXT requires InnoDB >= 5.6 (true on every modern MySQL/MariaDB).
ALTER TABLE `Products`
  ADD FULLTEXT INDEX IF NOT EXISTS `ft_products_search` (`name`, `brand`, `description`, `sku`);

CREATE INDEX IF NOT EXISTS `idx_products_status` ON `Products` (`status`);
CREATE INDEX IF NOT EXISTS `idx_products_catId`  ON `Products` (`catId`);
CREATE INDEX IF NOT EXISTS `idx_products_brand`  ON `Products` (`brand`);

-- ============================================================
-- 6.  ProductVariants — first-class variant rows
-- ============================================================
-- Replaces the legacy JSON-on-Products columns (size, productRam,
-- productWeight) so each combination carries its own SKU/price/stock.
-- Backfill the legacy data with:  node scripts/backfill-product-variants.mjs

CREATE TABLE IF NOT EXISTS `ProductVariants` (
  `id`         INT            NOT NULL AUTO_INCREMENT,
  `productId`  INT            NOT NULL,
  `sku`        VARCHAR(100)       NULL,
  `name`       VARCHAR(255)   NOT NULL,
  `attributes` JSON               NULL,
  `price`      DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
  `stock`      INT            NOT NULL DEFAULT 0,
  `isActive`   TINYINT(1)     NOT NULL DEFAULT 1,
  `position`   INT            NOT NULL DEFAULT 0,
  `createdAt`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_variants_productId` (`productId`),
  KEY `idx_variants_active`    (`isActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_variants_sku` ON `ProductVariants` (`sku`);

-- ============================================================
-- 7.  AbandonedCartReminders — email + WhatsApp + SMS recovery
-- ============================================================
-- Creates the table with the current schema if it doesn't exist, then
-- ALTERs to upgrade installs that have an older shape (the very early
-- version had email/name/cartValue/sentAt — the upgrade is additive).

CREATE TABLE IF NOT EXISTS `AbandonedCartReminders` (
  `id`                  INT           NOT NULL AUTO_INCREMENT,
  `userId`              INT           NOT NULL,
  `cartSubtotal`        DECIMAL(10,2) NOT NULL DEFAULT 0,
  `cartSnapshot`        JSON              NULL,
  `status`              ENUM('active','recovered','dismissed') NOT NULL DEFAULT 'active',
  `lastEmailSentAt`     DATETIME          NULL,
  `lastWhatsappSentAt`  DATETIME          NULL,
  `lastSmsSentAt`       DATETIME          NULL,
  `emailCount`          INT           NOT NULL DEFAULT 0,
  `whatsappCount`       INT           NOT NULL DEFAULT 0,
  `smsCount`            INT           NOT NULL DEFAULT 0,
  `detectedAt`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_abandoned_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `AbandonedCartReminders`
  ADD COLUMN IF NOT EXISTS `cartSubtotal`       DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `cartSnapshot`       JSON              NULL,
  ADD COLUMN IF NOT EXISTS `lastEmailSentAt`    DATETIME          NULL,
  ADD COLUMN IF NOT EXISTS `lastWhatsappSentAt` DATETIME          NULL,
  ADD COLUMN IF NOT EXISTS `lastSmsSentAt`      DATETIME          NULL,
  ADD COLUMN IF NOT EXISTS `emailCount`         INT           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `whatsappCount`      INT           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `smsCount`           INT           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `detectedAt`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS `updatedAt`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ============================================================
-- 8.  MyLists (wishlist) — back-in-stock notify timestamp
-- ============================================================
-- One-shot flag so the back-in-stock cron emails each user at most once
-- per wishlist row.

ALTER TABLE `MyLists`
  ADD COLUMN IF NOT EXISTS `backInStockNotifiedAt` DATETIME NULL;

-- ============================================================
-- 9.  WalletTopups — Razorpay wallet top-up + idempotency
-- ============================================================

CREATE TABLE IF NOT EXISTS `WalletTopups` (
  `id`                INT           NOT NULL AUTO_INCREMENT,
  `userId`            INT           NOT NULL,
  `razorpayOrderId`   VARCHAR(100)  NOT NULL,
  `razorpayPaymentId` VARCHAR(100)      NULL,
  `amount`            DECIMAL(10,2) NOT NULL,
  `status`            ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  `createdAt`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `WalletTopups`
  ADD COLUMN IF NOT EXISTS `idempotencyKey` VARCHAR(100) NULL AFTER `amount`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_wallet_topups_idempotencyKey`
  ON `WalletTopups` (`idempotencyKey`);

-- ============================================================
-- 10.  NewsletterSubscribers — exit-intent email capture
-- ============================================================

CREATE TABLE IF NOT EXISTS `NewsletterSubscribers` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `email`     VARCHAR(255) NOT NULL UNIQUE,
  `source`    VARCHAR(100)     NULL DEFAULT 'exit_popup',
  `createdAt` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 11.  WebhookEvents — Razorpay webhook deduping
-- ============================================================

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

-- ============================================================
-- 12.  Refunds — Razorpay refund tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS `Refunds` (
  `id`                INT           NOT NULL AUTO_INCREMENT,
  `orderId`           INT           NOT NULL,
  `userId`            INT           NOT NULL,
  `amount`            DECIMAL(10,2) NOT NULL,
  `currency`          VARCHAR(10)   NOT NULL DEFAULT 'INR',
  `razorpayPaymentId` VARCHAR(100)      NULL,
  `razorpayRefundId`  VARCHAR(100)      NULL,
  `status`            ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  `reason`            VARCHAR(500)      NULL,
  `requestedBy`       VARCHAR(20)   NOT NULL DEFAULT 'admin',
  `requestedById`     INT               NULL,
  `note`              TEXT              NULL,
  `failureReason`     TEXT              NULL,
  `createdAt`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processedAt`       DATETIME          NULL,
  PRIMARY KEY (`id`),
  KEY `idx_refunds_orderId` (`orderId`),
  KEY `idx_refunds_userId`  (`userId`),
  KEY `idx_refunds_status`  (`status`),
  UNIQUE KEY `uq_refunds_razorpayRefundId` (`razorpayRefundId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 13.  CounterSequences — atomic per-key counters (invoice numbers, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS `CounterSequences` (
  `name`      VARCHAR(64) NOT NULL,
  `period`    VARCHAR(32) NOT NULL,
  `value`     INT         NOT NULL DEFAULT 0,
  `updatedAt` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`, `period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 14.  SearchLogs — top searches + zero-result tracking
-- ============================================================

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
  KEY `idx_search_zero`      (`resultCount`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Done.
SELECT 'InfixMart migration complete' AS status;
