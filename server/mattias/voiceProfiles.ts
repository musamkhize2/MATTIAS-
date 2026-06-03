/**
 * Custom Voice Profiles System
 * Allows users to create, save, and execute custom voice command macros
 */

export interface VoiceProfile {
  id: string;
  userId: number;
  tenantId: number;
  name: string;
  description: string;
  triggerPhrase: string; // Voice trigger phrase
  commands: VoiceCommand[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastExecutedAt?: string;
}

export interface VoiceCommand {
  id: string;
  action: string;
  parameters: Record<string, any>;
  delay?: number; // Delay in ms before executing next command
  description: string;
}

export interface VoiceProfileExecution {
  id: string;
  profileId: string;
  userId: number;
  tenantId: number;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  results: ExecutionResult[];
  error?: string;
}

export interface ExecutionResult {
  commandId: string;
  action: string;
  success: boolean;
  result?: any;
  error?: string;
  executedAt: string;
  duration: number; // ms
}

/**
 * Parse trigger phrase and extract parameters
 */
export function parseTriggerPhrase(
  phrase: string
): { basePhrase: string; parameters: string[] } {
  // Extract parameters in format {paramName}
  const paramRegex = /\{(\w+)\}/g;
  const parameters: string[] = [];
  let match;

  while ((match = paramRegex.exec(phrase)) !== null) {
    parameters.push(match[1]);
  }

  const basePhrase = phrase.replace(paramRegex, '.*');

  return { basePhrase, parameters };
}

/**
 * Match voice input against trigger phrases
 */
export function matchTriggerPhrase(
  voiceInput: string,
  triggerPhrase: string
): { matched: boolean; parameters: Record<string, string> } {
  const { basePhrase, parameters } = parseTriggerPhrase(triggerPhrase);
  const regex = new RegExp(`^${basePhrase}$`, 'i');

  if (!regex.test(voiceInput)) {
    return { matched: false, parameters: {} };
  }

  // Extract parameter values
  const paramValues: Record<string, string> = {};
  const paramRegex = /\{(\w+)\}/g;
  const valueRegex = new RegExp(
    `^${triggerPhrase.replace(/\{(\w+)\}/g, '([^}]+)')}$`,
    'i'
  );
  const valueMatch = valueRegex.exec(voiceInput);

  if (valueMatch) {
    parameters.forEach((param, index) => {
      paramValues[param] = valueMatch[index + 1];
    });
  }

  return { matched: true, parameters: paramValues };
}

/**
 * Validate voice profile structure
 */
export function validateVoiceProfile(profile: Partial<VoiceProfile>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!profile.name || profile.name.trim().length === 0) {
    errors.push('Profile name is required');
  }

  if (!profile.triggerPhrase || profile.triggerPhrase.trim().length === 0) {
    errors.push('Trigger phrase is required');
  }

  if (!profile.commands || profile.commands.length === 0) {
    errors.push('At least one command is required');
  }

  if (profile.commands) {
    profile.commands.forEach((cmd, idx) => {
      if (!cmd.action || cmd.action.trim().length === 0) {
        errors.push(`Command ${idx + 1}: Action is required`);
      }
      if (!cmd.parameters || Object.keys(cmd.parameters).length === 0) {
        errors.push(`Command ${idx + 1}: Parameters are required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new voice profile
 */
export function createVoiceProfile(
  userId: number,
  tenantId: number,
  data: Omit<VoiceProfile, 'id' | 'userId' | 'tenantId' | 'createdAt' | 'updatedAt' | 'executionCount'>
): VoiceProfile {
  const validation = validateVoiceProfile(data);
  if (!validation.valid) {
    throw new Error(`Invalid profile: ${validation.errors.join(', ')}`);
  }

  return {
    id: `vp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    tenantId,
    name: data.name,
    description: data.description,
    triggerPhrase: data.triggerPhrase,
    commands: data.commands,
    enabled: data.enabled ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executionCount: 0,
  };
}

/**
 * Generate execution plan from profile
 */
export function generateExecutionPlan(
  profile: VoiceProfile,
  triggerParameters: Record<string, string> = {}
): VoiceCommand[] {
  return profile.commands.map((cmd) => ({
    ...cmd,
    parameters: {
      ...cmd.parameters,
      // Override with trigger parameters if provided
      ...Object.entries(triggerParameters).reduce((acc, [key, value]) => {
        if (cmd.parameters[key]) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, any>),
    },
  }));
}

/**
 * Format profile for display
 */
export function formatProfileDisplay(profile: VoiceProfile): string {
  const commandList = profile.commands
    .map((cmd, idx) => `  ${idx + 1}. ${cmd.action}: ${cmd.description}`)
    .join('\n');

  return (
    `📋 Voice Profile: ${profile.name}\n` +
    `🎤 Trigger: "${profile.triggerPhrase}"\n` +
    `📝 Description: ${profile.description}\n` +
    `✅ Status: ${profile.enabled ? 'Enabled' : 'Disabled'}\n` +
    `🔄 Executions: ${profile.executionCount}\n` +
    `Commands:\n${commandList}`
  );
}

/**
 * Format execution result for display
 */
export function formatExecutionResult(execution: VoiceProfileExecution): string {
  const successCount = execution.results.filter((r) => r.success).length;
  const failureCount = execution.results.filter((r) => !r.success).length;

  let result = `📊 Profile Execution Results\n`;
  result += `Status: ${execution.status.toUpperCase()}\n`;
  result += `Success: ${successCount} | Failed: ${failureCount}\n\n`;

  execution.results.forEach((r, idx) => {
    const icon = r.success ? '✅' : '❌';
    result += `${icon} Step ${idx + 1}: ${r.action} (${r.duration}ms)\n`;
    if (r.error) {
      result += `   Error: ${r.error}\n`;
    }
  });

  if (execution.error) {
    result += `\n⚠️ Overall Error: ${execution.error}`;
  }

  return result;
}

/**
 * Suggest profile improvements
 */
export function suggestProfileImprovements(profile: VoiceProfile): string[] {
  const suggestions: string[] = [];

  if (profile.triggerPhrase.length < 3) {
    suggestions.push('Trigger phrase is very short - consider making it more descriptive');
  }

  if (profile.commands.length > 10) {
    suggestions.push('Profile has many commands - consider breaking into smaller profiles');
  }

  const totalDelay = profile.commands.reduce((sum, cmd) => sum + (cmd.delay || 0), 0);
  if (totalDelay > 30000) {
    suggestions.push(`Total execution time is ${totalDelay / 1000}s - consider optimizing delays`);
  }

  if (profile.executionCount === 0) {
    suggestions.push('Profile has never been executed - test it first');
  }

  const failureRate = profile.executionCount > 0 ? 0 : 0; // Would need execution history
  if (failureRate > 0.3) {
    suggestions.push('Profile has high failure rate - review command parameters');
  }

  return suggestions;
}

/**
 * Clone an existing profile
 */
export function cloneProfile(
  profile: VoiceProfile,
  newName: string
): VoiceProfile {
  return {
    ...profile,
    id: `vp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: newName,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    executionCount: 0,
  };
}
