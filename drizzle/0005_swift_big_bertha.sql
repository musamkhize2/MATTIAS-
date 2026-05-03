CREATE TABLE `companies` (
	`id` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`industry` varchar(128),
	`website` varchar(255),
	`description` text,
	`monthlyRevenue` float,
	`employeeCount` int,
	`foundedYear` int,
	`contactEmail` varchar(320),
	`contactPhone` varchar(20),
	`location` varchar(255),
	`socialMediaLinks` json,
	`customMetrics` json,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_memory` (
	`id` varchar(36) NOT NULL,
	`companyId` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`memoryType` enum('interaction_history','performance_notes','campaign_insights','customer_feedback','market_analysis','strategic_goals','custom_note') NOT NULL,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`tags` json,
	`importance` enum('low','medium','high') DEFAULT 'medium',
	`aiInsights` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_memory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_metrics` (
	`id` varchar(36) NOT NULL,
	`companyId` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`totalCampaigns` int DEFAULT 0,
	`activeCampaigns` int DEFAULT 0,
	`totalAdSpend` float DEFAULT 0,
	`totalConversions` int DEFAULT 0,
	`averageROAS` float DEFAULT 0,
	`leadGenerated` int DEFAULT 0,
	`conversionRate` float DEFAULT 0,
	`customerAcquisitionCost` float DEFAULT 0,
	`monthOverMonthGrowth` float DEFAULT 0,
	`yearOverYearGrowth` float DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `company_metrics_id` PRIMARY KEY(`id`)
);
