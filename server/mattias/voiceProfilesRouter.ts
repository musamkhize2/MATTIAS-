import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  createVoiceProfile,
  matchTriggerPhrase,
  generateExecutionPlan,
  formatProfileDisplay,
  formatExecutionResult,
  suggestProfileImprovements,
  cloneProfile,
  validateVoiceProfile,
} from './voiceProfiles';
import { getOrCreateDefaultTenant } from '../db';

/**
 * Voice Profiles Router
 * Manages custom voice command macros and profiles
 */

// In-memory storage for demo (replace with database in production)
const voiceProfilesStore = new Map<string, any>();
const executionHistoryStore = new Map<string, any[]>();

export const voiceProfilesRouter = router({
  /**
   * Create a new voice profile
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        triggerPhrase: z.string().min(1),
        commands: z.array(
          z.object({
            id: z.string(),
            action: z.string(),
            parameters: z.record(z.any()),
            delay: z.number().optional(),
            description: z.string(),
          })
        ),
        enabled: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      try {
        const profile = createVoiceProfile(ctx.user.id, tenant.id, {
          name: input.name,
          description: input.description,
          triggerPhrase: input.triggerPhrase,
          commands: input.commands,
          enabled: input.enabled,
        });

        voiceProfilesStore.set(profile.id, profile);

        return {
          success: true,
          profile,
          message: `Voice profile "${profile.name}" created`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create profile',
        };
      }
    }),

  /**
   * List all voice profiles for user
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);

    const profiles = Array.from(voiceProfilesStore.values()).filter(
      (p) => p.userId === ctx.user.id && p.tenantId === tenant.id
    );

    return {
      success: true,
      profiles,
      total: profiles.length,
    };
  }),

  /**
   * Get a specific voice profile
   */
  get: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = voiceProfilesStore.get(input.profileId);

      if (!profile || profile.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      return {
        success: true,
        profile,
        display: formatProfileDisplay(profile),
      };
    }),

  /**
   * Update a voice profile
   */
  update: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        triggerPhrase: z.string().optional(),
        commands: z
          .array(
            z.object({
              id: z.string(),
              action: z.string(),
              parameters: z.record(z.any()),
              delay: z.number().optional(),
              description: z.string(),
            })
          )
          .optional(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = voiceProfilesStore.get(input.profileId);

      if (!profile || profile.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      const updated = {
        ...profile,
        name: input.name ?? profile.name,
        description: input.description ?? profile.description,
        triggerPhrase: input.triggerPhrase ?? profile.triggerPhrase,
        commands: input.commands ?? profile.commands,
        enabled: input.enabled ?? profile.enabled,
        updatedAt: new Date().toISOString(),
      };

      const validation = validateVoiceProfile(updated);
      if (!validation.valid) {
        return {
          success: false,
          error: `Invalid profile: ${validation.errors.join(', ')}`,
        };
      }

      voiceProfilesStore.set(input.profileId, updated);

      return {
        success: true,
        profile: updated,
        message: 'Profile updated',
      };
    }),

  /**
   * Delete a voice profile
   */
  delete: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const profile = voiceProfilesStore.get(input.profileId);

      if (!profile || profile.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      voiceProfilesStore.delete(input.profileId);
      executionHistoryStore.delete(input.profileId);

      return {
        success: true,
        message: `Profile "${profile.name}" deleted`,
      };
    }),

  /**
   * Match voice input against profiles and return matches
   */
  matchInput: protectedProcedure
    .input(z.object({ voiceInput: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      const profiles = Array.from(voiceProfilesStore.values()).filter(
        (p) => p.userId === ctx.user.id && p.tenantId === tenant.id && p.enabled
      );

      const matches: Array<{
        profile: any;
        matched: boolean;
        parameters: Record<string, string>;
      }> = [];

      profiles.forEach((profile) => {
        const result = matchTriggerPhrase(
        input.voiceInput,
        profile.triggerPhrase
      );
        if (result.matched) {
          matches.push({
            profile,
            matched: true,
            parameters: result.parameters,
          });
        }
      });

      return {
        success: true,
        matches,
        found: matches.length > 0,
      };
    }),

  /**
   * Get execution plan for a profile
   */
  getExecutionPlan: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        triggerParameters: z.record(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const profile = voiceProfilesStore.get(input.profileId);

      if (!profile || profile.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      const triggerParams = input.triggerParameters
        ? Object.entries(input.triggerParameters).reduce(
            (acc, [key, value]) => {
              acc[key] = String(value);
              return acc;
            },
            {} as Record<string, string>
          )
        : {};
      const plan = generateExecutionPlan(profile, triggerParams);

      return {
        success: true,
        plan,
        commandCount: plan.length,
        estimatedDuration: plan.reduce((sum, cmd) => sum + (cmd.delay || 0), 0),
      };
    }),

  /**
   * Get suggestions for profile improvement
   */
  getSuggestions: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = voiceProfilesStore.get(input.profileId);

      if (!profile || profile.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      const suggestions = suggestProfileImprovements(profile);

      return {
        success: true,
        suggestions,
        hasSuggestions: suggestions.length > 0,
      };
    }),

  /**
   * Clone a voice profile
   */
  clone: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        newName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = voiceProfilesStore.get(input.profileId);

      if (!profile || profile.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      const cloned = cloneProfile(profile, input.newName);
      voiceProfilesStore.set(cloned.id, cloned);

      return {
        success: true,
        profile: cloned,
        message: `Profile cloned as "${cloned.name}"`,
      };
    }),

  /**
   * Get execution history for a profile
   */
  getExecutionHistory: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const profile = voiceProfilesStore.get(input.profileId);

      if (!profile || profile.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Profile not found',
          executions: [],
        };
      }

      const history = (executionHistoryStore.get(input.profileId) || []).slice(
        -input.limit
      );

      return {
        success: true,
        executions: history,
        total: history.length,
      };
    }),

  /**
   * Get profile statistics
   */
  getStats: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const profile = voiceProfilesStore.get(input.profileId);

      if (!profile || profile.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Profile not found',
        };
      }

      const history = executionHistoryStore.get(input.profileId) || [];
      const successful = history.filter((e) => e.status === 'completed').length;
      const failed = history.filter((e) => e.status === 'failed').length;

      return {
        success: true,
        stats: {
          totalExecutions: profile.executionCount,
          successfulExecutions: successful,
          failedExecutions: failed,
          successRate:
            profile.executionCount > 0
              ? Math.round((successful / profile.executionCount) * 100)
              : 0,
          lastExecutedAt: profile.lastExecutedAt,
        },
      };
    }),
});
