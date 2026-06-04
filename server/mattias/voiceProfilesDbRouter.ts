import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb, getOrCreateDefaultTenant } from '../db';
import {
  voiceProfiles,
  voiceProfileCommands,
  voiceProfileExecutions,
  voiceProfileAnalytics,
} from '../../drizzle/schema';
import { matchTriggerPhrase, validateVoiceProfile } from './voiceProfiles';

/**
 * Database-backed Voice Profiles Router
 * Persists profiles and executions to database
 */

export const voiceProfilesDbRouter = router({
  /**
   * Create a new voice profile in database
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        triggerPhrase: z.string().min(1),
        commands: z.array(
          z.object({
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
      const db = await getDb();

      if (!db) {
        return {
          success: false,
          error: 'Database connection failed',
        };
      }

      try {
        const profileId = `vp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Insert profile
        await db.insert(voiceProfiles).values({
          id: profileId,
          tenantId: tenant.id,
          userId: ctx.user.id,
          name: input.name,
          description: input.description,
          triggerPhrase: input.triggerPhrase,
          enabled: input.enabled,
          executionCount: 0,
        });

        // Insert commands
        for (let i = 0; i < input.commands.length; i++) {
          const cmd = input.commands[i];
          await db.insert(voiceProfileCommands).values({
            id: `vpc_${Date.now()}_${i}`,
            profileId,
            tenantId: tenant.id,
            action: cmd.action,
            parameters: cmd.parameters,
            delay: cmd.delay || 0,
            description: cmd.description,
            sequenceOrder: i,
          });
        }

        // Create analytics record
        await db.insert(voiceProfileAnalytics).values({
          id: `vpa_${Date.now()}`,
          profileId,
          tenantId: tenant.id,
          userId: ctx.user.id,
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          averageExecutionTime: 0,
          successRate: 0,
        });

        return {
          success: true,
          profileId,
          message: `Voice profile "${input.name}" created`,
        };
      } catch (error) {
        console.error('[VoiceProfiles] Create failed:', error);
        return {
          success: false,
          error: 'Failed to create profile',
        };
      }
    }),

  /**
   * List all voice profiles for user
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        return {
          success: false,
          profiles: [],
          total: 0,
        };
      }

      try {
        const profiles = await db
          .select()
          .from(voiceProfiles)
          .where(
            and(
              eq(voiceProfiles.tenantId, tenant.id),
              eq(voiceProfiles.userId, ctx.user.id)
            )
          )
          .orderBy(desc(voiceProfiles.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        const countResult = await db
          .select()
          .from(voiceProfiles)
          .where(
            and(
              eq(voiceProfiles.tenantId, tenant.id),
              eq(voiceProfiles.userId, ctx.user.id)
            )
          );

        return {
          success: true,
          profiles,
          total: countResult.length,
        };
      } catch (error) {
        console.error('[VoiceProfiles] List failed:', error);
        return {
          success: false,
          profiles: [],
          total: 0,
        };
      }
    }),

  /**
   * Get a specific profile with commands
   */
  get: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        return {
          success: false,
          error: 'Database connection failed',
        };
      }

      try {
        const profile = await db
          .select()
          .from(voiceProfiles)
          .where(
            and(
              eq(voiceProfiles.id, input.profileId),
              eq(voiceProfiles.tenantId, tenant.id),
              eq(voiceProfiles.userId, ctx.user.id)
            )
          )
          .limit(1);

        if (!profile.length) {
          return {
            success: false,
            error: 'Profile not found',
          };
        }

        const commands = await db
          .select()
          .from(voiceProfileCommands)
          .where(eq(voiceProfileCommands.profileId, input.profileId))
          .orderBy(voiceProfileCommands.sequenceOrder);

        return {
          success: true,
          profile: {
            ...profile[0],
            commands: commands.map((c: any) => ({
              id: c.id,
              action: c.action,
              parameters: c.parameters,
              delay: c.delay,
              description: c.description,
            })),
          },
        };
      } catch (error) {
        console.error('[VoiceProfiles] Get failed:', error);
        return {
          success: false,
          error: 'Failed to fetch profile',
        };
      }
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
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        return {
          success: false,
          error: 'Database connection failed',
        };
      }

      try {
        await db
          .update(voiceProfiles)
          .set({
            name: input.name,
            description: input.description,
            triggerPhrase: input.triggerPhrase,
            enabled: input.enabled,
            updatedAt: new Date().toISOString(),
          })
          .where(
            and(
              eq(voiceProfiles.id, input.profileId),
              eq(voiceProfiles.tenantId, tenant.id),
              eq(voiceProfiles.userId, ctx.user.id)
            )
          );

        return {
          success: true,
          message: 'Profile updated',
        };
      } catch (error) {
        console.error('[VoiceProfiles] Update failed:', error);
        return {
          success: false,
          error: 'Failed to update profile',
        };
      }
    }),

  /**
   * Delete a voice profile
   */
  delete: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        return {
          success: false,
          error: 'Database connection failed',
        };
      }

      try {
        await db
          .delete(voiceProfiles)
          .where(
            and(
              eq(voiceProfiles.id, input.profileId),
              eq(voiceProfiles.tenantId, tenant.id),
              eq(voiceProfiles.userId, ctx.user.id)
            )
          );

        return {
          success: true,
          message: 'Profile deleted',
        };
      } catch (error) {
        console.error('[VoiceProfiles] Delete failed:', error);
        return {
          success: false,
          error: 'Failed to delete profile',
        };
      }
    }),

  /**
   * Record profile execution
   */
  recordExecution: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        status: z.enum(['pending', 'executing', 'completed', 'failed']),
        duration: z.number().optional(),
        error: z.string().optional(),
        results: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        return {
          success: false,
          error: 'Database connection failed',
        };
      }

      try {
        const executionId = `vpe_${Date.now()}`;

        // Insert execution record
        await db.insert(voiceProfileExecutions).values({
          id: executionId,
          profileId: input.profileId,
          tenantId: tenant.id,
          userId: ctx.user.id,
          status: input.status,
          completedAt:
            input.status === 'completed' || input.status === 'failed'
              ? new Date().toISOString()
              : undefined,
          error: input.error,
          results: input.results,
          duration: input.duration || 0,
        });

        // Update profile execution count
        if (input.status === 'completed') {
          const profile = await db
            .select()
            .from(voiceProfiles)
            .where(eq(voiceProfiles.id, input.profileId))
            .limit(1);

          if (profile.length > 0) {
            await db
              .update(voiceProfiles)
              .set({
                executionCount: (profile[0] as any).executionCount + 1,
                lastExecutedAt: new Date().toISOString(),
              })
              .where(eq(voiceProfiles.id, input.profileId));
          }
        }

        // Update analytics
        const analytics = await db
          .select()
          .from(voiceProfileAnalytics)
          .where(eq(voiceProfileAnalytics.profileId, input.profileId))
          .limit(1);

        if (analytics.length > 0) {
          const current = analytics[0] as any;
          const isSuccess = input.status === 'completed';
          const newTotal = current.totalExecutions + 1;
          const newSuccessful = isSuccess
            ? current.successfulExecutions + 1
            : current.successfulExecutions;
          const newFailed = !isSuccess
            ? current.failedExecutions + 1
            : current.failedExecutions;

          await db
            .update(voiceProfileAnalytics)
            .set({
              totalExecutions: newTotal,
              successfulExecutions: newSuccessful,
              failedExecutions: newFailed,
              averageExecutionTime: Math.round(
                (current.averageExecutionTime * current.totalExecutions +
                  (input.duration || 0)) /
                  newTotal
              ),
              successRate: Math.round((newSuccessful / newTotal) * 100),
              lastExecutedAt: new Date().toISOString(),
            })
            .where(eq(voiceProfileAnalytics.profileId, input.profileId));
        }

        return {
          success: true,
          executionId,
          message: 'Execution recorded',
        };
      } catch (error) {
        console.error('[VoiceProfiles] Record execution failed:', error);
        return {
          success: false,
          error: 'Failed to record execution',
        };
      }
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
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        return {
          success: false,
          executions: [],
        };
      }

      try {
        const executions = await db
          .select()
          .from(voiceProfileExecutions)
          .where(
            and(
              eq(voiceProfileExecutions.profileId, input.profileId),
              eq(voiceProfileExecutions.tenantId, tenant.id),
              eq(voiceProfileExecutions.userId, ctx.user.id)
            )
          )
          .orderBy(desc(voiceProfileExecutions.createdAt))
          .limit(input.limit);

        return {
          success: true,
          executions,
        };
      } catch (error) {
        console.error('[VoiceProfiles] Get execution history failed:', error);
        return {
          success: false,
          executions: [],
        };
      }
    }),

  /**
   * Get profile analytics
   */
  getAnalytics: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        return {
          success: false,
          analytics: null,
        };
      }

      try {
        const analytics = await db
          .select()
          .from(voiceProfileAnalytics)
          .where(
            and(
              eq(voiceProfileAnalytics.profileId, input.profileId),
              eq(voiceProfileAnalytics.tenantId, tenant.id),
              eq(voiceProfileAnalytics.userId, ctx.user.id)
            )
          )
          .limit(1);

        return {
          success: true,
          analytics: analytics.length > 0 ? analytics[0] : null,
        };
      } catch (error) {
        console.error('[VoiceProfiles] Get analytics failed:', error);
        return {
          success: false,
          analytics: null,
        };
      }
    }),
});
