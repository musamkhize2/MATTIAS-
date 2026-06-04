-- Profile Shares Table
CREATE TABLE IF NOT EXISTS `profile_shares` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `profileId` varchar(64) NOT NULL,
  `tenantId` int NOT NULL,
  `ownerId` int NOT NULL,
  `sharedWithUserId` int,
  `sharedWithTeamId` int,
  `role` enum('viewer', 'executor', 'editor', 'admin') DEFAULT 'viewer',
  `sharedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `expiresAt` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_profile` (`profileId`),
  KEY `idx_tenant` (`tenantId`),
  KEY `idx_owner` (`ownerId`),
  KEY `idx_shared_user` (`sharedWithUserId`),
  KEY `idx_shared_team` (`sharedWithTeamId`),
  FOREIGN KEY (`profileId`) REFERENCES `voice_profiles`(`id`) ON DELETE CASCADE
);

-- Profile Versions Table
CREATE TABLE IF NOT EXISTS `profile_versions` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `profileId` varchar(64) NOT NULL,
  `tenantId` int NOT NULL,
  `userId` int NOT NULL,
  `versionNumber` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `triggerPhrase` varchar(255) NOT NULL,
  `commands` json NOT NULL,
  `changeLog` text,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_profile` (`profileId`),
  KEY `idx_tenant` (`tenantId`),
  KEY `idx_version` (`profileId`, `versionNumber`),
  UNIQUE KEY `uq_profile_version` (`profileId`, `versionNumber`),
  FOREIGN KEY (`profileId`) REFERENCES `voice_profiles`(`id`) ON DELETE CASCADE
);

-- Scheduled Profile Executions Table
CREATE TABLE IF NOT EXISTS `scheduled_profile_executions` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `profileId` varchar(64) NOT NULL,
  `tenantId` int NOT NULL,
  `userId` int NOT NULL,
  `cronExpression` varchar(255) NOT NULL,
  `enabled` boolean DEFAULT true,
  `nextExecutionAt` timestamp NULL,
  `lastExecutionAt` timestamp NULL,
  `lastExecutionStatus` enum('success', 'failed', 'pending'),
  `executionCount` int DEFAULT 0,
  `failureCount` int DEFAULT 0,
  `timezone` varchar(64) DEFAULT 'UTC',
  `notifyOnFailure` boolean DEFAULT true,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_profile` (`profileId`),
  KEY `idx_tenant_user` (`tenantId`, `userId`),
  KEY `idx_enabled` (`enabled`),
  KEY `idx_next_execution` (`nextExecutionAt`),
  FOREIGN KEY (`profileId`) REFERENCES `voice_profiles`(`id`) ON DELETE CASCADE
);

-- Scheduled Execution Logs Table
CREATE TABLE IF NOT EXISTS `scheduled_execution_logs` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `scheduleId` varchar(64) NOT NULL,
  `profileId` varchar(64) NOT NULL,
  `tenantId` int NOT NULL,
  `status` enum('success', 'failed', 'skipped') DEFAULT 'pending',
  `startedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `completedAt` timestamp NULL,
  `duration` int DEFAULT 0,
  `error` text,
  `results` json,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_schedule` (`scheduleId`),
  KEY `idx_profile` (`profileId`),
  KEY `idx_tenant` (`tenantId`),
  KEY `idx_status` (`status`),
  KEY `idx_created` (`createdAt`),
  FOREIGN KEY (`scheduleId`) REFERENCES `scheduled_profile_executions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`profileId`) REFERENCES `voice_profiles`(`id`) ON DELETE CASCADE
);
