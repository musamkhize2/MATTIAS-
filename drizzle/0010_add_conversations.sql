CREATE TABLE IF NOT EXISTS `conversation_history` (
`id` varchar(64) NOT NULL PRIMARY KEY,
`conversationId` varchar(64) NOT NULL,
`tenantId` int NOT NULL,
`userId` int NOT NULL,
`role` enum('system','user','assistant') NOT NULL,
`content` text NOT NULL,
`metadata` json,
`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS `conversations` (
`id` varchar(64) NOT NULL PRIMARY KEY,
`tenantId` int NOT NULL,
`userId` int NOT NULL,
`title` varchar(255) NOT NULL,
`systemPrompt` text,
`isArchived` boolean DEFAULT false,
`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
`updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX `idx_conversation_history_conversationId` ON `conversation_history` (`conversationId`);
CREATE INDEX `idx_conversation_history_tenantId` ON `conversation_history` (`tenantId`);
CREATE INDEX `idx_conversations_tenantId` ON `conversations` (`tenantId`);
CREATE INDEX `idx_conversations_userId` ON `conversations` (`userId`);
