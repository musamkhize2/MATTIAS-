CREATE TABLE `cognitive_budgets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`subscriptionTier` enum('personal','professional','enterprise') NOT NULL,
	`maxThreads` int DEFAULT 2,
	`maxRounds` int DEFAULT 1,
	`maxTotalTokens` int DEFAULT 4000,
	`maxLatencyMs` int DEFAULT 2000,
	`deepCfeTriggersPerDay` int DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cognitive_budgets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cognitive_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`eventId` bigint,
	`originalContent` text,
	`summarizedContent` text,
	`embedding` json,
	`distortionScore` float DEFAULT 0,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cognitive_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cognitive_sessions` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`eventId` bigint,
	`mode` enum('focus','creative','crisis','exploratory') NOT NULL DEFAULT 'focus',
	`complexity` varchar(32) DEFAULT 'medium',
	`threadCount` int DEFAULT 1,
	`roundCount` int DEFAULT 1,
	`tokensUsed` int DEFAULT 0,
	`confidence` float DEFAULT 0.5,
	`finalOutput` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	CONSTRAINT `cognitive_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_insights` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`generatedAt` timestamp NOT NULL DEFAULT (now()),
	`insights` json,
	`identityUpdates` json,
	`memoryReindexed` int DEFAULT 0,
	`suggestedActions` json,
	CONSTRAINT `daily_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `identity_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tenantId` int NOT NULL,
	`thinkingStyle` enum('strategic_balanced','creative_exploratory','analytical_rigorous','pragmatic_direct') NOT NULL DEFAULT 'strategic_balanced',
	`riskTolerance` float DEFAULT 0.6,
	`creativityBias` float DEFAULT 0.5,
	`communicationStyle` enum('direct_warm','formal_precise','casual_friendly','executive_concise') NOT NULL DEFAULT 'direct_warm',
	`decisionConfidenceProfile` enum('progressive','conservative','balanced') NOT NULL DEFAULT 'balanced',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `identity_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `identity_profiles_tenantId_unique` UNIQUE(`tenantId`)
);
--> statement-breakpoint
CREATE TABLE `thought_nodes` (
	`id` varchar(64) NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`threadType` enum('logical','intuitive','contrarian','memory','creative','ethical') NOT NULL,
	`content` text NOT NULL,
	`confidence` float DEFAULT 0.5,
	`relevance` float DEFAULT 0.5,
	`emotionalValence` varchar(32),
	`suggestedActions` json,
	`challenges` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `thought_nodes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `uncertainty_flags` (
	`id` varchar(64) NOT NULL,
	`tenantId` int NOT NULL,
	`sessionId` varchar(64),
	`eventId` bigint,
	`confidenceScore` float NOT NULL,
	`reason` text,
	`conflictingData` json,
	`recommendedAction` varchar(255),
	`humanReviewRequested` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `uncertainty_flags_id` PRIMARY KEY(`id`)
);
