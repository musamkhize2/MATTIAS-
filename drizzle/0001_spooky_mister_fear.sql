CREATE TABLE `agent_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`agentName` varchar(128) NOT NULL,
	`config` json NOT NULL,
	`enabled` boolean DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`eventData` json NOT NULL,
	`agentName` varchar(128),
	`agentReasoning` text,
	`actionType` varchar(128) NOT NULL,
	`actionPayload` json,
	`requestedBy` int,
	`riskScore` float,
	`status` enum('PENDING','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`correlationId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `command_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int,
	`command` text NOT NULL,
	`response` text,
	`agentsInvolved` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `command_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `entities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`type` varchar(64) NOT NULL,
	`name` varchar(255) NOT NULL,
	`currentState` json NOT NULL,
	`version` int DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `entities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`eventType` varchar(128) NOT NULL,
	`aggregateId` varchar(128) NOT NULL,
	`aggregateType` varchar(64) NOT NULL,
	`occurrenceTime` timestamp NOT NULL DEFAULT (now()),
	`data` json NOT NULL,
	`causationId` bigint,
	`correlationId` varchar(128),
	`source` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `feature_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`featureKey` varchar(128) NOT NULL,
	`description` text,
	`enabledTiers` json,
	CONSTRAINT `feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `feature_flags_featureKey_unique` UNIQUE(`featureKey`)
);
--> statement-breakpoint
CREATE TABLE `memory_embeddings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`content` text NOT NULL,
	`eventId` bigint,
	`embedding` json,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `memory_embeddings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`eventConditions` json NOT NULL,
	`actionConditions` json,
	`effect` enum('ALLOW','DENY','REQUIRE_APPROVAL') NOT NULL,
	`precedence` int DEFAULT 0,
	`enabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relationships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`fromEntityId` int NOT NULL,
	`toEntityId` int NOT NULL,
	`relationshipType` varchar(64) NOT NULL,
	`properties` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `relationships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`subscriptionTier` enum('personal','professional','enterprise') NOT NULL DEFAULT 'personal',
	`autonomyLevel` enum('manual','assisted','approval_guarded','autonomous') NOT NULL DEFAULT 'assisted',
	`features` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workflow_definitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`startEventType` varchar(128) NOT NULL,
	`definition` json NOT NULL,
	`enabled` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workflow_definitions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` int;