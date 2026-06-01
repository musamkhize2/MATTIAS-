CREATE TABLE `actionHistory` (
	`id` varchar(64) NOT NULL,
	`actionId` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`status` varchar(64) NOT NULL,
	`message` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `actionHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `actions` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`status` enum('pending','executing','completed','failed') NOT NULL DEFAULT 'pending',
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`payload` json NOT NULL,
	`result` json,
	`error` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`executedAt` timestamp,
	`completedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailCampaigns` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`templateId` varchar(64) NOT NULL,
	`status` enum('draft','scheduled','sending','sent') NOT NULL DEFAULT 'draft',
	`recipientCount` int NOT NULL DEFAULT 0,
	`sentCount` int NOT NULL DEFAULT 0,
	`openCount` int NOT NULL DEFAULT 0,
	`clickCount` int NOT NULL DEFAULT 0,
	`recipients` json NOT NULL,
	`actionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailDeliveryStatus` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`campaignId` varchar(64) NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`status` enum('queued','sent','delivered','opened','clicked','bounced','unsubscribed','failed') NOT NULL DEFAULT 'queued',
	`messageId` varchar(255),
	`openCount` int NOT NULL DEFAULT 0,
	`clickCount` int NOT NULL DEFAULT 0,
	`lastEventTime` timestamp,
	`failureReason` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailDeliveryStatus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhookEventLog` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`eventType` varchar(64) NOT NULL,
	`deliveryStatusId` varchar(64),
	`webhookPayload` json NOT NULL,
	`processed` boolean NOT NULL DEFAULT false,
	`processedAt` timestamp,
	`error` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`maxRetries` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `webhookEventLog_id` PRIMARY KEY(`id`)
);
