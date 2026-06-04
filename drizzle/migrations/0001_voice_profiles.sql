-- Voice Profiles Table
CREATE TABLE IF NOT EXISTS `voice_profiles` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `tenantId` int NOT NULL,
  `userId` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `triggerPhrase` varchar(255) NOT NULL,
  `enabled` boolean DEFAULT true,
  `executionCount` int DEFAULT 0,
  `lastExecutedAt` timestamp NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_tenant_user` (`tenantId`, `userId`),
  KEY `idx_enabled` (`enabled`)
);

-- Voice Profile Commands Table
CREATE TABLE IF NOT EXISTS `voice_profile_commands` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `profileId` varchar(64) NOT NULL,
  `tenantId` int NOT NULL,
  `action` varchar(255) NOT NULL,
  `parameters` json NOT NULL,
  `delay` int DEFAULT 0,
  `description` text,
  `sequenceOrder` int NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_profile` (`profileId`),
  KEY `idx_tenant` (`tenantId`),
  FOREIGN KEY (`profileId`) REFERENCES `voice_profiles`(`id`) ON DELETE CASCADE
);

-- Voice Profile Executions Table
CREATE TABLE IF NOT EXISTS `voice_profile_executions` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `profileId` varchar(64) NOT NULL,
  `tenantId` int NOT NULL,
  `userId` int NOT NULL,
  `status` enum('pending', 'executing', 'completed', 'failed') DEFAULT 'pending',
  `startedAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `completedAt` timestamp NULL,
  `error` text,
  `results` json,
  `duration` int DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_profile` (`profileId`),
  KEY `idx_tenant_user` (`tenantId`, `userId`),
  KEY `idx_status` (`status`),
  FOREIGN KEY (`profileId`) REFERENCES `voice_profiles`(`id`) ON DELETE CASCADE
);

-- Voice Profile Analytics Table
CREATE TABLE IF NOT EXISTS `voice_profile_analytics` (
  `id` varchar(64) NOT NULL PRIMARY KEY,
  `profileId` varchar(64) NOT NULL,
  `tenantId` int NOT NULL,
  `userId` int NOT NULL,
  `totalExecutions` int DEFAULT 0,
  `successfulExecutions` int DEFAULT 0,
  `failedExecutions` int DEFAULT 0,
  `averageExecutionTime` int DEFAULT 0,
  `lastExecutedAt` timestamp NULL,
  `successRate` int DEFAULT 0,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  KEY `idx_profile` (`profileId`),
  KEY `idx_tenant_user` (`tenantId`, `userId`),
  UNIQUE KEY `uq_profile` (`profileId`),
  FOREIGN KEY (`profileId`) REFERENCES `voice_profiles`(`id`) ON DELETE CASCADE
);
