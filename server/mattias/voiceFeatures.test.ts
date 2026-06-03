import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseVoiceCommand,
  getAvailableCommands,
  validateCommandParameters,
  getCommandInstructions,
  mapCommandToTRPCPath,
  formatCommandResult,
} from './voiceCommandExecutor';
import {
  extractDates,
  extractAmounts,
  extractRecipients,
  extractKeywords,
  refineCommandParameters,
  formatExtractedParameters,
} from './advancedParameterRefinement';

describe('Voice Command Executor', () => {
  describe('parseVoiceCommand', () => {
    it('should parse campaign creation commands', () => {
      const command = parseVoiceCommand('create campaign named Q2 Sales Push');
      expect(command).toBeDefined();
      expect(command?.action).toBe('createCampaign');
      expect(command?.parameters.name).toContain('Q2 Sales Push');
    });

    it('should parse campaign sending commands', () => {
      const command = parseVoiceCommand('send campaign 42');
      expect(command).toBeDefined();
      expect(command?.action).toBe('sendCampaign');
      expect(command?.parameters.campaignId).toBe(42);
    });

    it('should parse list commands', () => {
      const command = parseVoiceCommand('list campaigns');
      expect(command).toBeDefined();
      expect(command?.action).toBe('listCampaigns');
    });

    it('should parse analytics commands', () => {
      const command = parseVoiceCommand('get analytics for last 7 days');
      expect(command).toBeDefined();
      expect(command?.action).toBe('getAnalytics');
    });

    it('should parse approval commands', () => {
      const command = parseVoiceCommand('approve request 123');
      expect(command).toBeDefined();
      expect(command?.action).toBe('approveRequest');
      expect(command?.parameters.approvalId).toBe(123);
    });

    it('should return null for unrecognized commands', () => {
      const command = parseVoiceCommand('xyz unknown command');
      expect(command).toBeNull();
    });
  });

  describe('validateCommandParameters', () => {
    it('should validate campaign creation', () => {
      const command = {
        action: 'createCampaign',
        parameters: { name: 'Test Campaign' },
        confidence: 0.95,
      };
      const result = validateCommandParameters(command);
      expect(result.valid).toBe(true);
    });

    it('should reject campaign send without ID', () => {
      const command = {
        action: 'sendCampaign',
        parameters: { campaignId: null },
        confidence: 0.95,
      };
      const result = validateCommandParameters(command);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate approval commands', () => {
      const command = {
        action: 'approveRequest',
        parameters: { approvalId: 123 },
        confidence: 0.95,
      };
      const result = validateCommandParameters(command);
      expect(result.valid).toBe(true);
    });
  });

  describe('getCommandInstructions', () => {
    it('should return instructions for known commands', () => {
      const command = {
        action: 'createCampaign',
        parameters: {},
        confidence: 0.95,
      };
      const instructions = getCommandInstructions(command);
      expect(instructions).toContain('Creating');
    });

    it('should return generic instruction for unknown commands', () => {
      const command = {
        action: 'unknownAction',
        parameters: {},
        confidence: 0.95,
      };
      const instructions = getCommandInstructions(command);
      expect(instructions).toBe('Executing command...');
    });
  });

  describe('mapCommandToTRPCPath', () => {
    it('should map campaign commands to tRPC paths', () => {
      const command = {
        action: 'createCampaign',
        parameters: {},
        confidence: 0.95,
      };
      const path = mapCommandToTRPCPath(command);
      expect(path).toBe('emailCampaigns.create');
    });

    it('should return null for client-side commands', () => {
      const command = {
        action: 'navigateDashboard',
        parameters: {},
        confidence: 0.95,
      };
      const path = mapCommandToTRPCPath(command);
      expect(path).toBeNull();
    });
  });

  describe('formatCommandResult', () => {
    it('should format campaign creation result', () => {
      const command = {
        action: 'createCampaign',
        parameters: {},
        confidence: 0.95,
      };
      const result = formatCommandResult(command, { name: 'Test Campaign' });
      expect(result).toContain('Test Campaign');
      expect(result).toContain('created');
    });

    it('should format analytics result', () => {
      const command = {
        action: 'getAnalytics',
        parameters: {},
        confidence: 0.95,
      };
      const result = formatCommandResult(command, {
        totalSent: 1000,
        opened: 350,
        clicked: 85,
      });
      expect(result).toContain('1000');
      expect(result).toContain('350');
    });
  });

  describe('getAvailableCommands', () => {
    it('should return command categories', () => {
      const commands = getAvailableCommands();
      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
      expect(commands[0]).toHaveProperty('category');
      expect(commands[0]).toHaveProperty('commands');
    });
  });
});

describe('Advanced Parameter Refinement', () => {
  describe('extractDates', () => {
    it('should extract today', () => {
      const dates = extractDates('send campaign today');
      expect(dates).toBeDefined();
      expect(dates?.relative).toBe('today');
      expect(dates?.start).toBeDefined();
    });

    it('should extract relative ranges', () => {
      const dates = extractDates('analytics for last 7 days');
      expect(dates).toBeDefined();
      expect(dates?.relative).toBe('last_7_days');
      expect(dates?.start).toBeDefined();
      expect(dates?.end).toBeDefined();
    });

    it('should extract ISO dates', () => {
      const dates = extractDates('report for 2026-06-04');
      expect(dates).toBeDefined();
      expect(dates?.start).toBeDefined();
    });

    it('should return undefined for no dates', () => {
      const dates = extractDates('create campaign');
      expect(dates).toBeUndefined();
    });
  });

  describe('extractAmounts', () => {
    it('should extract currency symbols', () => {
      const amounts = extractAmounts('budget of $5000');
      expect(amounts).toBeDefined();
      expect(amounts?.[0].value).toBe(5000);
      expect(amounts?.[0].currency).toBe('USD');
    });

    it('should extract text-based currencies', () => {
      const amounts = extractAmounts('spend 100 euros');
      expect(amounts).toBeDefined();
      expect(amounts?.[0].value).toBe(100);
      expect(amounts?.[0].currency).toBe('EUR');
    });

    it('should extract ISO currency codes', () => {
      const amounts = extractAmounts('amount 50 GBP');
      expect(amounts).toBeDefined();
      expect(amounts?.[0].value).toBe(50);
      expect(amounts?.[0].currency).toBe('GBP');
    });

    it('should return undefined for no amounts', () => {
      const amounts = extractAmounts('create campaign');
      expect(amounts).toBeUndefined();
    });
  });

  describe('extractRecipients', () => {
    it('should extract email addresses', () => {
      const recipients = extractRecipients('send to john@example.com');
      expect(recipients).toBeDefined();
      expect(recipients).toContain('john@example.com');
    });

    it('should extract names after to', () => {
      const recipients = extractRecipients('send to john and jane');
      expect(recipients).toBeDefined();
      expect(recipients?.length).toBeGreaterThan(0);
    });

    it('should return undefined for no recipients', () => {
      const recipients = extractRecipients('create campaign');
      expect(recipients).toBeUndefined();
    });
  });

  describe('extractKeywords', () => {
    it('should extract hashtags', () => {
      const keywords = extractKeywords('campaign #sales #q2');
      expect(keywords).toBeDefined();
      expect(keywords).toContain('sales');
      expect(keywords).toContain('q2');
    });

    it('should extract quoted phrases', () => {
      const keywords = extractKeywords('create "summer campaign"');
      expect(keywords).toBeDefined();
      expect(keywords).toContain('summer campaign');
    });

    it('should return undefined for no keywords', () => {
      const keywords = extractKeywords('create campaign');
      expect(keywords).toBeUndefined();
    });
  });

  describe('refineCommandParameters', () => {
    it('should extract all parameter types', () => {
      const params = refineCommandParameters(
        'send campaign to john@example.com for $5000 #sales today'
      );
      expect(params.recipients).toBeDefined();
      expect(params.amounts).toBeDefined();
      expect(params.keywords).toBeDefined();
      expect(params.dates).toBeDefined();
    });
  });

  describe('formatExtractedParameters', () => {
    it('should format parameters for display', () => {
      const params = {
        dates: { relative: 'today' },
        amounts: [{ value: 100, currency: 'USD' }],
        recipients: ['john@example.com'],
        keywords: ['sales'],
      };
      const formatted = formatExtractedParameters(params);
      expect(formatted).toContain('today');
      expect(formatted).toContain('100');
      expect(formatted).toContain('john@example.com');
    });

    it('should return no parameters message when empty', () => {
      const formatted = formatExtractedParameters({});
      expect(formatted).toContain('No parameters');
    });
  });
});
