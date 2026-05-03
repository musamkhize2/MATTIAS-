CREATE TABLE `credential_audit_trail` (
	`id` varchar(36) NOT NULL,
	`credentialId` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`action` enum('created','verified','used','rotated','refreshed','disabled','enabled','deleted','failed_verification') NOT NULL,
	`actionDetails` json,
	`performedBy` int,
	`ipAddress` varchar(45),
	`userAgent` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `credential_audit_trail_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credential_rotation_history` (
	`id` varchar(36) NOT NULL,
	`credentialId` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`rotationType` enum('manual','automatic','emergency') NOT NULL,
	`oldTokenHash` text,
	`newTokenHash` text,
	`rotationStatus` enum('pending','completed','failed') DEFAULT 'pending',
	`rotationError` text,
	`rotatedBy` int,
	`rotatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credential_rotation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `credential_rotation_policies` (
	`id` varchar(36) NOT NULL,
	`tenantId` int NOT NULL,
	`integrationName` varchar(128) NOT NULL,
	`rotationIntervalDays` int NOT NULL DEFAULT 90,
	`autoRotateEnabled` boolean DEFAULT false,
	`rotationTime` varchar(5),
	`notifyBeforeDays` int DEFAULT 7,
	`requireApprovalForRotation` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `credential_rotation_policies_id` PRIMARY KEY(`id`)
);
