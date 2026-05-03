-- ============================================================
--  InfixMart – Incremental Migration  (MySQL 8.0+)
--  Run this on an EXISTING database that was set up before
--  the referral / wallet / tracking features were added.
--  Safe to run multiple times (IF NOT EXISTS / IGNORE).
-- ============================================================

SET NAMES utf8mb4;

-- ── Users: new columns ───────────────────────────────────────
ALTER TABLE `Users`
  ADD COLUMN IF NOT EXISTS `referralCode`  VARCHAR(20)   NULL         AFTER `rto_count`,
  ADD COLUMN IF NOT EXISTS `referredBy`    INT           NULL         AFTER `referralCode`,
  ADD COLUMN IF NOT EXISTS `walletBalance` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `referredBy`;

-- Unique index on referralCode (safe to run if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS `uq_users_referralCode` ON `Users` (`referralCode`);

-- ── Orders: tracking columns ─────────────────────────────────
ALTER TABLE `Orders`
  ADD COLUMN IF NOT EXISTS `trackingNumber` VARCHAR(100) NULL AFTER `status`,
  ADD COLUMN IF NOT EXISTS `courierName`    VARCHAR(100) NULL AFTER `trackingNumber`,
  ADD COLUMN IF NOT EXISTS `trackingUrl`    VARCHAR(500) NULL AFTER `courierName`;

-- ── Products: sale & video columns ──────────────────────────
ALTER TABLE `Products`
  ADD COLUMN IF NOT EXISTS `videoUrl`   VARCHAR(500) NULL AFTER `productWeight`,
  ADD COLUMN IF NOT EXISTS `saleEndsAt` DATETIME     NULL AFTER `videoUrl`;

-- ── New tables (created automatically by the app on first use,
--    but listed here for completeness / manual pre-creation) ──

CREATE TABLE IF NOT EXISTS `ReferralLogs` (
  `id`         INT      NOT NULL AUTO_INCREMENT,
  `referrerId` INT      NOT NULL,
  `refereeId`  INT      NOT NULL,
  `orderId`    INT          NULL,
  `credited`   TINYINT(1) NOT NULL DEFAULT 0,
  `creditedAt` DATETIME     NULL,
  `createdAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_referee` (`refereeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Drop old AbandonedCartReminders if it has the legacy schema (wrong columns),
-- then recreate with correct schema. Safe: app auto-heals this table on first request.
CREATE TABLE IF NOT EXISTS `AbandonedCartReminders` (
  `id`                  INT           NOT NULL AUTO_INCREMENT,
  `userId`              INT           NOT NULL,
  `cartSubtotal`        DECIMAL(10,2) NOT NULL DEFAULT 0,
  `cartSnapshot`        JSON              NULL,
  `status`              ENUM('active','recovered','dismissed') NOT NULL DEFAULT 'active',
  `lastEmailSentAt`     DATETIME          NULL,
  `lastWhatsappSentAt`  DATETIME          NULL,
  `emailCount`          INT           NOT NULL DEFAULT 0,
  `whatsappCount`       INT           NOT NULL DEFAULT 0,
  `detectedAt`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_abandoned_userId` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Upgrade existing AbandonedCartReminders tables created from the old migration
ALTER TABLE `AbandonedCartReminders`
  ADD COLUMN IF NOT EXISTS `cartSubtotal`       DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `cartSnapshot`       JSON              NULL,
  ADD COLUMN IF NOT EXISTS `lastEmailSentAt`    DATETIME          NULL,
  ADD COLUMN IF NOT EXISTS `lastWhatsappSentAt` DATETIME          NULL,
  ADD COLUMN IF NOT EXISTS `emailCount`         INT           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `whatsappCount`      INT           NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS `detectedAt`         DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS `updatedAt`          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- ── WalletTopups (auto-created by app) ───────────────────────
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

-- ── NewsletterSubscribers (auto-created by app) ──────────────
CREATE TABLE IF NOT EXISTS `NewsletterSubscribers` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `email`     VARCHAR(255) NOT NULL UNIQUE,
  `source`    VARCHAR(100)     NULL DEFAULT 'exit_popup',
  `createdAt` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `AdminAuditLog` (
  `id`        INT          NOT NULL AUTO_INCREMENT,
  `adminId`   INT              NULL,
  `action`    VARCHAR(100) NOT NULL,
  `entity`    VARCHAR(50)      NULL,
  `entityId`  INT              NULL,
  `detail`    TEXT             NULL,
  `createdAt` DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ProductQA` (
  `id`         INT      NOT NULL AUTO_INCREMENT,
  `productId`  INT      NOT NULL,
  `userId`     INT          NULL,
  `question`   TEXT     NOT NULL,
  `answer`     TEXT         NULL,
  `answeredAt` DATETIME     NULL,
  `createdAt`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_qa_productId` (`productId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `PushSubscriptions` (
  `id`        INT      NOT NULL AUTO_INCREMENT,
  `userId`    INT          NULL,
  `endpoint`  TEXT     NOT NULL,
  `p256dh`    TEXT         NULL,
  `auth`      TEXT         NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2026-04 Top Production Risks migration (see db/PROD_MIGRATION_2026_04.md)
-- ============================================================

-- ── OrderItems table (already written by app, formalize schema) ──
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

-- ── Orders: idempotency + cancellation columns ──
ALTER TABLE `Orders`
  ADD COLUMN IF NOT EXISTS `idempotencyKey` VARCHAR(100) NULL AFTER `paymentResult`,
  ADD COLUMN IF NOT EXISTS `cancelledAt`    DATETIME     NULL AFTER `courierName`,
  ADD COLUMN IF NOT EXISTS `cancelReason`   VARCHAR(500) NULL AFTER `cancelledAt`,
  ADD COLUMN IF NOT EXISTS `cancelledBy`    VARCHAR(20)  NULL AFTER `cancelReason`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_orders_idempotencyKey`
  ON `Orders` (`idempotencyKey`);

-- ── WalletTopups: idempotency ──
ALTER TABLE `WalletTopups`
  ADD COLUMN IF NOT EXISTS `idempotencyKey` VARCHAR(100) NULL AFTER `amount`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_wallet_topups_idempotencyKey`
  ON `WalletTopups` (`idempotencyKey`);

-- ── WebhookEvents (Razorpay webhook deduping) ──
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

-- ── Refunds ──
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

-- ── Users: account lockout columns ──
ALTER TABLE `Users`
  ADD COLUMN IF NOT EXISTS `failedLoginCount`  INT      NOT NULL DEFAULT 0  AFTER `last_login_date`,
  ADD COLUMN IF NOT EXISTS `lockedUntil`       DATETIME     NULL            AFTER `failedLoginCount`,
  ADD COLUMN IF NOT EXISTS `lastFailedLoginAt` DATETIME     NULL            AFTER `lockedUntil`;

-- ============================================================
-- 2026-04 Catalog & Search migration (Section D)
-- ============================================================

-- ── Products: status + view/purchase counters + reorder threshold ──
ALTER TABLE `Products`
  ADD COLUMN IF NOT EXISTS `status`           ENUM('draft','active','archived') NOT NULL DEFAULT 'active' AFTER `sku`,
  ADD COLUMN IF NOT EXISTS `viewCount`        INT NOT NULL DEFAULT 0 AFTER `saleEndsAt`,
  ADD COLUMN IF NOT EXISTS `purchaseCount`    INT NOT NULL DEFAULT 0 AFTER `viewCount`,
  ADD COLUMN IF NOT EXISTS `reorderThreshold` INT NOT NULL DEFAULT 5 AFTER `purchaseCount`;

-- ── Products: SKU uniqueness ──
-- Run BEFORE this if you have duplicate SKUs in production:
--   SELECT sku, COUNT(*) FROM Products WHERE sku IS NOT NULL GROUP BY sku HAVING COUNT(*) > 1;
-- Resolve duplicates manually before adding the unique index.
CREATE UNIQUE INDEX IF NOT EXISTS `uq_products_sku` ON `Products` (`sku`);

-- ── Products: FULLTEXT search index ──
-- Note: FULLTEXT requires InnoDB >= 5.6. Skip silently if unsupported.
ALTER TABLE `Products`
  ADD FULLTEXT INDEX IF NOT EXISTS `ft_products_search` (`name`, `brand`, `description`, `sku`);

-- ── Products: helper indexes for status/category/brand filters ──
CREATE INDEX IF NOT EXISTS `idx_products_status` ON `Products` (`status`);
CREATE INDEX IF NOT EXISTS `idx_products_catId`  ON `Products` (`catId`);
CREATE INDEX IF NOT EXISTS `idx_products_brand`  ON `Products` (`brand`);

-- ============================================================
-- 2026-04 Analytics & Growth migration (Section F)
-- ============================================================

-- ============================================================
-- 2026-04 Compliance & Invoicing migration (Section G)
-- ============================================================

-- ── CounterSequences (atomic per-key counters, e.g. invoice numbers) ──
CREATE TABLE IF NOT EXISTS `CounterSequences` (
  `name`      VARCHAR(64) NOT NULL,
  `period`    VARCHAR(32) NOT NULL,
  `value`     INT         NOT NULL DEFAULT 0,
  `updatedAt` DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`name`, `period`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Orders: invoiceNumber column ──
ALTER TABLE `Orders`
  ADD COLUMN IF NOT EXISTS `invoiceNumber` VARCHAR(40) NULL AFTER `idempotencyKey`;

CREATE UNIQUE INDEX IF NOT EXISTS `uq_orders_invoiceNumber` ON `Orders` (`invoiceNumber`);

-- ── Users: soft-delete column (data deletion requests) ──
ALTER TABLE `Users`
  ADD COLUMN IF NOT EXISTS `deletedAt` DATETIME NULL AFTER `lastFailedLoginAt`;

-- ── SearchLogs (top searches + zero-result tracking) ──
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

-- ============================================================
-- 2026-05 ProductVariants — first-class variant rows
-- ============================================================
--
-- Replaces the legacy JSON-on-Products columns (`size`, `productRam`,
-- `productWeight`) with first-class variant rows so each combination can
-- carry its own SKU, price, and stock. The new table is also auto-healed
-- from `lib/server/repositories/product-variants.ts` (CREATE TABLE IF NOT
-- EXISTS on first read), so re-running this migration is optional.
--
-- Backfill the existing JSON arrays into rows with:
--   node scripts/backfill-product-variants.mjs
-- (see the script for behavior — it is safe to re-run; uses INSERT IGNORE).

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

-- Done.
SELECT 'Migration complete' AS status;
