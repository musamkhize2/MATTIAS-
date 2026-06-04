import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getOrCreateDefaultTenant } from '../db';

/**
 * Scheduled Profile Execution Router
 * Manages cron-based profile scheduling
 */

interface ScheduledProfile {
  id: string;
  profileId: string;
  tenantId: number;
  userId: number;
  cronExpression: string;
  enabled: boolean;
  nextExecutionAt?: string;
  lastExecutionAt?: string;
  lastExecutionStatus?: 'success' | 'failed' | 'pending';
  executionCount: number;
  failureCount: number;
  timezone: string;
  notifyOnFailure: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionLog {
  id: string;
  scheduleId: string;
  profileId: string;
  tenantId: number;
  status: 'success' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  duration: number;
  error?: string;
  results?: any;
  createdAt: string;
}

// In-memory storage for demo
const scheduledProfilesStore = new Map<string, ScheduledProfile>();
const executionLogsStore = new Map<string, ExecutionLog[]>();

/**
 * Validate cron expression
 */
function validateCronExpression(cron: string): boolean {
  // Basic validation - proper cron: minute hour day month dayOfWeek
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  // Check each part is valid
  const ranges = [
    { min: 0, max: 59 }, // minute
    { min: 0, max: 23 }, // hour
    { min: 1, max: 31 }, // day
    { min: 1, max: 12 }, // month
    { min: 0, max: 6 }, // dayOfWeek
  ];

  return parts.every((part, idx) => {
    if (part === '*') return true;
    if (part === '?') return idx === 2 || idx === 4; // Only for day or dayOfWeek
    if (part.includes(',')) return part.split(',').every((p) => validateCronPart(p, ranges[idx]));
    if (part.includes('-')) {
      const [start, end] = part.split('-');
      return (
        validateCronPart(start, ranges[idx]) &&
        validateCronPart(end, ranges[idx]) &&
        parseInt(start) <= parseInt(end)
      );
    }
    if (part.includes('/')) {
      const [base, step] = part.split('/');
      return validateCronPart(base, ranges[idx]) && validateCronPart(step, ranges[idx]);
    }
    return validateCronPart(part, ranges[idx]);
  });
}

function validateCronPart(part: string, range: { min: number; max: number }): boolean {
  if (part === '*' || part === '?') return true;
  const num = parseInt(part);
  return !isNaN(num) && num >= range.min && num <= range.max;
}

/**
 * Calculate next execution time (simplified)
 */
function calculateNextExecution(cron: string, timezone: string): string {
  // Simplified: just add 1 hour for demo
  const next = new Date();
  next.setHours(next.getHours() + 1);
  return next.toISOString();
}

export const scheduledProfileRouter = router({
  /**
   * Create a scheduled profile execution
   */
  create: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        cronExpression: z.string(),
        timezone: z.string().default('UTC'),
        notifyOnFailure: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      if (!validateCronExpression(input.cronExpression)) {
        return {
          success: false,
          error: 'Invalid cron expression format',
        };
      }

      try {
        const scheduleId = `sch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const nextExecution = calculateNextExecution(input.cronExpression, input.timezone);

        const schedule: ScheduledProfile = {
          id: scheduleId,
          profileId: input.profileId,
          tenantId: tenant.id,
          userId: ctx.user.id,
          cronExpression: input.cronExpression,
          enabled: true,
          nextExecutionAt: nextExecution,
          executionCount: 0,
          failureCount: 0,
          timezone: input.timezone,
          notifyOnFailure: input.notifyOnFailure,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        scheduledProfilesStore.set(scheduleId, schedule);
        executionLogsStore.set(scheduleId, []);

        return {
          success: true,
          scheduleId,
          nextExecution,
          message: 'Schedule created',
        };
      } catch (error) {
        console.error('[ScheduledProfile] Create failed:', error);
        return {
          success: false,
          error: 'Failed to create schedule',
        };
      }
    }),

  /**
   * List all schedules for a profile
   */
  listForProfile: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      try {
        const schedules = Array.from(scheduledProfilesStore.values()).filter(
          (s) =>
            s.profileId === input.profileId &&
            s.tenantId === tenant.id &&
            s.userId === ctx.user.id
        );

        return {
          success: true,
          schedules,
          total: schedules.length,
        };
      } catch (error) {
        console.error('[ScheduledProfile] List failed:', error);
        return {
          success: false,
          schedules: [],
          total: 0,
        };
      }
    }),

  /**
   * Get a specific schedule
   */
  get: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const schedule = scheduledProfilesStore.get(input.scheduleId);

      if (!schedule || schedule.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Schedule not found',
        };
      }

      return {
        success: true,
        schedule,
      };
    }),

  /**
   * Update a schedule
   */
  update: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        cronExpression: z.string().optional(),
        enabled: z.boolean().optional(),
        notifyOnFailure: z.boolean().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const schedule = scheduledProfilesStore.get(input.scheduleId);

      if (!schedule || schedule.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Schedule not found',
        };
      }

      if (input.cronExpression && !validateCronExpression(input.cronExpression)) {
        return {
          success: false,
          error: 'Invalid cron expression format',
        };
      }

      try {
        if (input.cronExpression) {
          schedule.cronExpression = input.cronExpression;
          schedule.nextExecutionAt = calculateNextExecution(
            input.cronExpression,
            input.timezone || schedule.timezone
          );
        }
        if (input.enabled !== undefined) schedule.enabled = input.enabled;
        if (input.notifyOnFailure !== undefined) schedule.notifyOnFailure = input.notifyOnFailure;
        if (input.timezone) schedule.timezone = input.timezone;

        schedule.updatedAt = new Date().toISOString();
        scheduledProfilesStore.set(input.scheduleId, schedule);

        return {
          success: true,
          message: 'Schedule updated',
        };
      } catch (error) {
        console.error('[ScheduledProfile] Update failed:', error);
        return {
          success: false,
          error: 'Failed to update schedule',
        };
      }
    }),

  /**
   * Delete a schedule
   */
  delete: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const schedule = scheduledProfilesStore.get(input.scheduleId);

      if (!schedule || schedule.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Schedule not found',
        };
      }

      try {
        scheduledProfilesStore.delete(input.scheduleId);
        executionLogsStore.delete(input.scheduleId);

        return {
          success: true,
          message: 'Schedule deleted',
        };
      } catch (error) {
        console.error('[ScheduledProfile] Delete failed:', error);
        return {
          success: false,
          error: 'Failed to delete schedule',
        };
      }
    }),

  /**
   * Get execution logs for a schedule
   */
  getExecutionLogs: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const schedule = scheduledProfilesStore.get(input.scheduleId);

      if (!schedule || schedule.userId !== ctx.user.id) {
        return {
          success: false,
          logs: [],
          total: 0,
        };
      }

      try {
        const allLogs = executionLogsStore.get(input.scheduleId) || [];
        const paginatedLogs = allLogs
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(input.offset, input.offset + input.limit);

        return {
          success: true,
          logs: paginatedLogs,
          total: allLogs.length,
        };
      } catch (error) {
        console.error('[ScheduledProfile] Get logs failed:', error);
        return {
          success: false,
          logs: [],
          total: 0,
        };
      }
    }),

  /**
   * Record an execution
   */
  recordExecution: protectedProcedure
    .input(
      z.object({
        scheduleId: z.string(),
        status: z.enum(['success', 'failed', 'skipped']),
        duration: z.number().optional(),
        error: z.string().optional(),
        results: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const schedule = scheduledProfilesStore.get(input.scheduleId);

      if (!schedule || schedule.userId !== ctx.user.id) {
        return {
          success: false,
          error: 'Schedule not found',
        };
      }

      try {
        const logId = `log_${Date.now()}`;
        const log: ExecutionLog = {
          id: logId,
          scheduleId: input.scheduleId,
          profileId: schedule.profileId,
          tenantId: schedule.tenantId,
          status: input.status,
          startedAt: new Date().toISOString(),
          completedAt:
            input.status !== 'pending' ? new Date().toISOString() : undefined,
          duration: input.duration || 0,
          error: input.error,
          results: input.results,
          createdAt: new Date().toISOString(),
        };

        const logs = executionLogsStore.get(input.scheduleId) || [];
        logs.push(log);
        executionLogsStore.set(input.scheduleId, logs);

        // Update schedule stats
        schedule.executionCount += 1;
        if (input.status === 'failed') schedule.failureCount += 1;
        schedule.lastExecutionAt = new Date().toISOString();
        schedule.lastExecutionStatus = input.status;
        schedule.nextExecutionAt = calculateNextExecution(
          schedule.cronExpression,
          schedule.timezone
        );

        scheduledProfilesStore.set(input.scheduleId, schedule);

        return {
          success: true,
          logId,
          message: 'Execution recorded',
        };
      } catch (error) {
        console.error('[ScheduledProfile] Record execution failed:', error);
        return {
          success: false,
          error: 'Failed to record execution',
        };
      }
    }),

  /**
   * Get schedule statistics
   */
  getStats: protectedProcedure
    .input(z.object({ scheduleId: z.string() }))
    .query(async ({ ctx, input }) => {
      const schedule = scheduledProfilesStore.get(input.scheduleId);

      if (!schedule || schedule.userId !== ctx.user.id) {
        return {
          success: false,
          stats: null,
        };
      }

      const logs = executionLogsStore.get(input.scheduleId) || [];
      const successCount = logs.filter((l) => l.status === 'success').length;
      const failureCount = logs.filter((l) => l.status === 'failed').length;
      const successRate =
        logs.length > 0 ? Math.round((successCount / logs.length) * 100) : 0;
      const avgDuration =
        logs.length > 0 ? Math.round(logs.reduce((sum, l) => sum + l.duration, 0) / logs.length) : 0;

      return {
        success: true,
        stats: {
          totalExecutions: schedule.executionCount,
          successfulExecutions: successCount,
          failedExecutions: failureCount,
          successRate,
          averageDuration: avgDuration,
          lastExecutionAt: schedule.lastExecutionAt,
          nextExecutionAt: schedule.nextExecutionAt,
          enabled: schedule.enabled,
        },
      };
    }),

  /**
   * Validate cron expression
   */
  validateCron: protectedProcedure
    .input(z.object({ cronExpression: z.string() }))
    .query(async ({ input }) => {
      const isValid = validateCronExpression(input.cronExpression);

      return {
        success: true,
        isValid,
        message: isValid ? 'Valid cron expression' : 'Invalid cron expression format',
      };
    }),
});
