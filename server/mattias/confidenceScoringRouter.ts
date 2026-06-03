import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  evaluateConfidence,
  generateConfidenceFeedback,
  getExecutionStrategy,
  formatConfidenceDisplay,
  calculateConfidenceScore,
} from './confidenceScoring';
import { getDb, getOrCreateDefaultTenant } from '../db';
import { voiceInteractions } from '../../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Confidence Scoring Router
 * Evaluates command confidence and manages confirmation workflows
 */

export const confidenceScoringRouter = router({
  /**
   * Evaluate command confidence and determine if confirmation is needed
   */
  evaluateCommand: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        commandAction: z.string().nullable(),
        extractedParams: z.record(z.any()).optional(),
        confidenceThreshold: z.number().min(0).max(1).default(0.8),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      // Get recent command history for context
      let userHistory: Array<{ action: string; timestamp: Date }> = [];

      if (db) {
        try {
          const recentCommands = await db
            .select()
            .from(voiceInteractions)
            .where(
              and(
                eq(voiceInteractions.tenantId, tenant.id),
                eq(voiceInteractions.userId, ctx.user.id)
              )
            )
            .orderBy(desc(voiceInteractions.createdAt))
            .limit(20);

          userHistory = recentCommands.map((cmd: any) => ({
            action: cmd.transcribedText || '',
            timestamp: new Date(cmd.createdAt),
          }));
        } catch (error) {
          console.error('[Confidence] History fetch failed:', error);
        }
      }

      const result = evaluateConfidence(
        input.text,
        input.commandAction,
        input.extractedParams || {},
        userHistory,
        input.confidenceThreshold
      );

      return {
        success: true,
        score: result.score,
        requiresConfirmation: result.requiresConfirmation,
        confirmationPrompt: result.confirmationPrompt,
        suggestedAlternatives: result.suggestedAlternatives,
        feedback: generateConfidenceFeedback(result),
        strategy: getExecutionStrategy(result.score),
        display: formatConfidenceDisplay(result.score),
      };
    }),

  /**
   * Save confidence evaluation result
   */
  saveEvaluation: protectedProcedure
    .input(
      z.object({
        commandText: z.string(),
        commandAction: z.string().nullable(),
        confidenceScore: z.number().min(0).max(1),
        requiresConfirmation: z.boolean(),
        userConfirmed: z.boolean().optional(),
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
        await db.insert(voiceInteractions).values({
          id: `vi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId: tenant.id,
          userId: ctx.user.id,
          transcribedText: input.commandText,
          language: 'en',
          confidence: Math.round(input.confidenceScore * 100).toString(),
          audioUrl: '',
          status: input.userConfirmed ? 'completed' : 'pending',
        });

        return {
          success: true,
          message: 'Evaluation saved',
        };
      } catch (error) {
        console.error('[Confidence] Save failed:', error);
        return {
          success: false,
          error: 'Failed to save evaluation',
        };
      }
    }),

  /**
   * Get confidence statistics for user
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);
    const db = await getDb();

    if (!db) {
      return {
        success: false,
        stats: {
          averageConfidence: 0,
          commandsEvaluated: 0,
          confirmationRate: 0,
          topActions: [],
        },
      };
    }

    try {
      const interactions = await db
        .select()
        .from(voiceInteractions)
        .where(
          and(
            eq(voiceInteractions.tenantId, tenant.id),
            eq(voiceInteractions.userId, ctx.user.id)
          )
        );

      const confidenceValues = interactions
        .map((i: any) => {
          const conf = parseFloat(i.confidence || '0');
          return isNaN(conf) ? 0 : conf;
        })
        .filter((c: number) => c > 0);

      const averageConfidence =
        confidenceValues.length > 0
          ? Math.round(
              (confidenceValues.reduce((a: number, b: number) => a + b, 0) /
                confidenceValues.length) *
                100
            ) / 100
          : 0;

      const confirmationCount = interactions.filter(
        (i: any) => i.status === 'pending'
      ).length;
      const confirmationRate =
        interactions.length > 0
          ? Math.round((confirmationCount / interactions.length) * 100)
          : 0;

      // Get top command actions
      const actionCounts: Record<string, number> = {};
      interactions.forEach((i: any) => {
        const action = i.transcribedText?.split(' ')[0] || 'unknown';
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      });

      const topActions = Object.entries(actionCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([action, count]) => ({ action, count }));

      return {
        success: true,
        stats: {
          averageConfidence,
          commandsEvaluated: interactions.length,
          confirmationRate,
          topActions,
        },
      };
    } catch (error) {
      console.error('[Confidence] Stats failed:', error);
      return {
        success: false,
        stats: {
          averageConfidence: 0,
          commandsEvaluated: 0,
          confirmationRate: 0,
          topActions: [],
        },
      };
    }
  }),

  /**
   * Batch evaluate multiple commands
   */
  evaluateBatch: protectedProcedure
    .input(
      z.object({
        commands: z.array(
          z.object({
            text: z.string(),
            commandAction: z.string().nullable(),
            extractedParams: z.record(z.any()).optional(),
          })
        ),
        confidenceThreshold: z.number().min(0).max(1).default(0.8),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = input.commands.map((cmd) => {
        const result = evaluateConfidence(
          cmd.text,
          cmd.commandAction,
          cmd.extractedParams || {},
          [],
          input.confidenceThreshold
        );

        return {
          text: cmd.text,
          score: result.score,
          requiresConfirmation: result.requiresConfirmation,
          strategy: getExecutionStrategy(result.score),
        };
      });

      const requiresConfirmation = results.filter((r) => r.requiresConfirmation).length;

      return {
        success: true,
        results,
        summary: {
          total: results.length,
          requiresConfirmation,
          canExecuteDirectly: results.length - requiresConfirmation,
        },
      };
    }),
});
