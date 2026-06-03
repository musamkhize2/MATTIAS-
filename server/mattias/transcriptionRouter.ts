import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { protectedProcedure, router } from '../_core/trpc';
import { transcribeAudio } from '../_core/voiceTranscription';
import { getDb, getOrCreateDefaultTenant } from '../db';
import { voiceInteractions } from '../../drizzle/schema';

/**
 * Transcription Router
 * Handles audio transcription using Whisper API
 */

export const transcriptionRouter = router({
  /**
   * Transcribe audio blob to text
   */
  transcribeAudio: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        language: z.string().optional().default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language,
        });

        if ('error' in result) {
          return {
            success: false,
            error: result.error,
          };
        }

        return {
          success: true,
          text: result.text,
          language: result.language,
          confidence: 0.95,
        };
      } catch (error) {
        console.error('[Transcription] Error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Transcription failed',
        };
      }
    }),

  /**
   * Save transcription to history
   */
  saveTranscription: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        language: z.string().optional().default('en'),
        confidence: z.number().min(0).max(1),
        audioUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        throw new Error('Database connection failed');
      }

      try {
        await db.insert(voiceInteractions).values({
          id: `vi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          tenantId: tenant.id,
          userId: ctx.user.id,
          transcribedText: input.text,
          language: input.language,
          confidence: input.confidence.toString(),
          audioUrl: input.audioUrl || '',
          status: 'completed',
        });

        return {
          success: true,
          message: 'Transcription saved',
          id: `vi_${Date.now()}`,
        };
      } catch (error) {
        console.error('[Transcription] Save failed:', error);
        throw new Error('Failed to save transcription');
      }
    }),

  /**
   * Get transcription history
   */
  getHistory: protectedProcedure
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
          interactions: [],
          total: 0,
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
          )
          .limit(input.limit)
          .offset(input.offset);

        return {
          success: true,
          interactions,
          total: interactions.length,
        };
      } catch (error) {
        console.error('[Transcription] History fetch failed:', error);
        return {
          success: false,
          interactions: [],
          total: 0,
        };
      }
    }),

  /**
   * Batch transcribe multiple audio files
   */
  transcribeBatch: protectedProcedure
    .input(
      z.object({
        audioUrls: z.array(z.string().url()),
        language: z.string().optional().default('en'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const results = await Promise.all(
          input.audioUrls.map(async (url) => {
            try {
              const result = await transcribeAudio({
                audioUrl: url,
                language: input.language,
              });
              
              if ('error' in result) {
                return {
                  url,
                  success: false,
                  error: result.error,
                };
              }
              
              return {
                url,
                success: true,
                text: result.text,
              };
            } catch (error) {
              return {
                url,
                success: false,
                error: error instanceof Error ? error.message : 'Transcription failed',
              };
            }
          })
        );

        const successful = results.filter((r) => r.success).length;
        const failed = results.filter((r) => !r.success).length;

        return {
          success: true,
          results,
          summary: {
            total: results.length,
            successful,
            failed,
          },
        };
      } catch (error) {
        console.error('[Transcription] Batch failed:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Batch transcription failed',
        };
      }
    }),

  /**
   * Get transcription statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const tenant = await getOrCreateDefaultTenant(ctx.user.id);
    const db = await getDb();

    if (!db) {
      return {
        success: false,
        stats: {
          totalTranscriptions: 0,
          averageConfidence: 0,
          languages: [],
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

      const totalTranscriptions = interactions.length;
      const averageConfidence =
        interactions.length > 0
          ? interactions.reduce((sum: number, i: any) => sum + (i.confidence || 0), 0) /
            interactions.length
          : 0;

      const languageSet = new Set<string>();
      interactions.forEach((i: any) => {
        languageSet.add(i.language || 'en');
      });
      const languages = Array.from(languageSet);

      return {
        success: true,
        stats: {
          totalTranscriptions,
          averageConfidence: Math.round(averageConfidence * 100) / 100,
          languages,
        },
      };
    } catch (error) {
      console.error('[Transcription] Stats failed:', error);
      return {
        success: false,
        stats: {
          totalTranscriptions: 0,
          averageConfidence: 0,
          languages: [],
        },
      };
    }
  }),
});
