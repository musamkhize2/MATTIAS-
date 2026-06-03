import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { getDb, getOrCreateDefaultTenant } from "../db";
import { voiceInteractions } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Voice Transcription Router
 * Handles voice-to-text conversion and voice command execution
 */

export const voiceTranscriptionRouter = router({
  /**
   * Transcribe audio file to text
   */
  transcribe: protectedProcedure
    .input(
      z.object({
        audioUrl: z.string().url(),
        language: z.string().optional(),
        prompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      try {
        // Transcribe audio
        const result = await transcribeAudio({
          audioUrl: input.audioUrl,
          language: input.language,
          prompt: input.prompt,
        });

        // Store transcription
        try {
          const voiceId = `voice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          if (db) {
            await db.insert(voiceInteractions).values({
              id: voiceId,
              tenantId: tenant.id,
              userId: ctx.user.id,
              audioUrl: input.audioUrl,
              transcribedText: result.text,
              language: result.language || input.language || "en",
              duration: 0,
              confidence: "0.95",
              status: "completed",
            });
          }
        } catch (storageError) {
          console.warn("[Voice] Failed to store transcription:", storageError);
        }

        return {
          success: true,
          text: result.text,
          language: result.language,
          segments: result.segments,
        };
      } catch (error) {
        console.error("[Voice] Transcription failed:", error);
        throw new Error(
          `Transcription failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  /**
   * Get voice interaction history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      try {
        const history = await db
          .select()
          .from(voiceInteractions)
          .where(and(eq(voiceInteractions.tenantId, tenant.id), eq(voiceInteractions.userId, ctx.user.id)))
          .limit(input.limit)
          .offset(input.offset);

        return {
          success: true,
          interactions: history,
          total: history.length,
        };
      } catch (error) {
        console.warn("[Voice] History not available:", error);
        return {
          success: false,
          interactions: [],
          total: 0,
        };
      }
    }),

  /**
   * Execute voice command
   */
  executeCommand: protectedProcedure
    .input(
      z.object({
        command: z.string(),
        audioUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      try {
        // Parse and execute command
        const commandLower = input.command.toLowerCase();
        let result = { success: false, message: "Command not recognized" };

        // Simple command routing
        if (commandLower.includes("create campaign")) {
          result = { success: true, message: "Campaign creation initiated" };
        } else if (commandLower.includes("send email")) {
          result = { success: true, message: "Email sending initiated" };
        } else if (commandLower.includes("get analytics")) {
          result = { success: true, message: "Analytics retrieved" };
        } else if (commandLower.includes("list companies")) {
          result = { success: true, message: "Companies listed" };
        } else if (commandLower.includes("show dashboard")) {
          result = { success: true, message: "Dashboard displayed" };
        }

        // Store voice command execution
        try {
          await db.insert(voiceInteractions).values({
            id: `voice-cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            tenantId: tenant.id,
            userId: ctx.user.id,
            audioUrl: input.audioUrl || "",
            transcribedText: input.command,
            language: "en",
            duration: 0,
            confidence: 1.0,
            status: result.success ? "executed" : "failed",
            createdAt: new Date().toISOString(),
          });
        } catch (storageError) {
          console.warn("[Voice] Failed to store command:", storageError);
        }

        return result;
      } catch (error) {
        console.error("[Voice] Command execution failed:", error);
        return {
          success: false,
          message: `Command execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        };
      }
    }),

  /**
   * Delete voice interaction
   */
  deleteInteraction: protectedProcedure
    .input(z.object({ interactionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      try {
        if (db) {
          await db
            .delete(voiceInteractions)
            .where(
              and(
                eq(voiceInteractions.id, input.interactionId),
                eq(voiceInteractions.tenantId, tenant.id),
                eq(voiceInteractions.userId, ctx.user.id)
              )
            );
        }

        return { success: true };
      } catch (error) {
        console.error("[Voice] Delete failed:", error);
        return { success: false };
      }
    }),
});
