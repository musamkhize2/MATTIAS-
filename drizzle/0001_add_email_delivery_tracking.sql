-- Add email delivery tracking table
CREATE TABLE IF NOT EXISTS `emailDeliveryStatus` (
  `id` varchar(64) PRIMARY KEY,
  `tenantId` int NOT NULL,
  `campaignId` varchar(64) NOT NULL,
  `recipientEmail` varchar(320) NOT NULL,
  `status` enum('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'failed') DEFAULT 'queued' NOT NULL,
  `messageId` varchar(255),
  `openCount` int DEFAULT 0 NOT NULL,
  `clickCount` int DEFAULT 0 NOT NULL,
  `lastEventTime` timestamp,
  `failureReason` text,
  `metadata` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_campaignId` (`campaignId`),
  KEY `idx_recipientEmail` (`recipientEmail`),
  KEY `idx_status` (`status`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add webhook event log table for audit trail
CREATE TABLE IF NOT EXISTS `webhookEventLog` (
  `id` varchar(64) PRIMARY KEY,
  `tenantId` int NOT NULL,
  `eventType` varchar(64) NOT NULL,
  `deliveryStatusId` varchar(64),
  `webhookPayload` json NOT NULL,
  `processed` boolean DEFAULT false NOT NULL,
  `processedAt` timestamp,
  `error` text,
  `retryCount` int DEFAULT 0 NOT NULL,
  `maxRetries` int DEFAULT 3 NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_eventType` (`eventType`),
  KEY `idx_processed` (`processed`),
  KEY `idx_tenantId` (`tenantId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
