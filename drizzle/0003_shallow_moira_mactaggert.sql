CREATE TABLE `business_profiles` (
	`id` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`legalName` varchar(255),
	`description` text,
	`industry` varchar(128),
	`businessActivities` json,
	`websiteUrl` varchar(512),
	`logoUrl` varchar(512),
	`annualRevenueTarget` float,
	`monthlyRevenueTarget` float,
	`avgDealSize` float,
	`avgUnitPrice` float,
	`targetMarginPercent` float,
	`currency` varchar(3) DEFAULT 'USD',
	`operationalHours` json,
	`defaultLanguage` varchar(10) DEFAULT 'en',
	`aiConfig` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `business_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `integration_credentials` (
	`id` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`businessProfileId` varchar(36),
	`integrationType` varchar(64) NOT NULL,
	`integrationName` varchar(128) NOT NULL,
	`displayName` varchar(255) NOT NULL,
	`encryptedCredentials` text NOT NULL,
	`credentialType` enum('api_key','oauth_token','basic_auth','custom') NOT NULL,
	`oauthToken` text,
	`refreshToken` text,
	`tokenExpiresAt` timestamp,
	`isVerified` boolean DEFAULT false,
	`verificationStatus` enum('pending','verified','failed','expired') DEFAULT 'pending',
	`lastVerifiedAt` timestamp,
	`verificationError` text,
	`isActive` boolean DEFAULT true,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `integration_credentials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `multi_role_approvals` (
	`id` varchar(36) NOT NULL,
	`approvalId` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`requiredRoles` json NOT NULL,
	`approvalChain` json NOT NULL,
	`allApprovalsReceived` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `multi_role_approvals_id` PRIMARY KEY(`id`)
);
