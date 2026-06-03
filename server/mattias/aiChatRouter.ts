import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { getDb, getOrCreateDefaultTenant } from "../db";
import { conversationHistory, conversations } from "../../drizzle/schema";

/**
 * AI Chat Router
 * Handles conversational AI interactions with message history and context
 */

export const aiChatRouter = router({
  /**
   * Send a chat message and get an AI response
   * Supports multi-turn conversations with context
   */
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(
          z.object({
            role: z.enum(["system", "user", "assistant"]),
            content: z.string(),
          })
        ),
        conversationId: z.string().optional(),
        systemPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = getDb();

      try {
        // Build messages with optional system prompt
        const messages = input.systemPrompt
          ? [
              { role: "system" as const, content: input.systemPrompt },
              ...input.messages,
            ]
          : input.messages;

        // Call LLM with the conversation
        const response = await invokeLLM({
          messages: messages,
        });

        // Extract the response content
        const assistantMessage =
          response.choices?.[0]?.message?.content || "No response generated";

        // Store conversation history if conversationId provided
        if (input.conversationId) {
          try {
            // Store user message
            await db.insert(conversationHistory).values({
              id: `msg-${Date.now()}-${Math.random()}`,
              conversationId: input.conversationId,
              tenantId: tenant.id,
              userId: ctx.user.id,
              role: "user",
              content: input.messages[input.messages.length - 1]?.content || "",
              createdAt: new Date().toISOString(),
            });

            // Store assistant response
            await db.insert(conversationHistory).values({
              id: `msg-${Date.now()}-${Math.random()}`,
              conversationId: input.conversationId,
              tenantId: tenant.id,
              userId: ctx.user.id,
              role: "assistant",
              content: assistantMessage,
              createdAt: new Date().toISOString(),
            });
          } catch (storageError) {
            // Log but don't fail if storage fails
            console.warn("[AI Chat] Failed to store conversation history:", storageError);
          }
        }

        return {
          success: true,
          response: assistantMessage,
          conversationId: input.conversationId,
        };
      } catch (error) {
        console.error("[AI Chat] Error:", error);
        throw new Error(`AI chat failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),

  /**
   * Get conversation history
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = getDb();

      try {
        // Get conversation history
        const history = await db
          .select()
          .from(conversationHistory)
          .where(
            (t: any) =>
              t.conversationId === input.conversationId &&
              t.tenantId === tenant.id
          )
          .limit(input.limit)
          .offset(input.offset);

        return {
          success: true,
          messages: history,
          total: history.length,
        };
      } catch (error) {
        console.warn("[AI Chat] History not available:", error);
        return {
          success: false,
          messages: [],
          total: 0,
        };
      }
    }),

  /**
   * Create a new conversation
   */
  createConversation: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
        systemPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const conversationId = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const db = getDb();

      try {
        await db.insert(conversations).values({
          id: conversationId,
          tenantId: tenant.id,
          userId: ctx.user.id,
          title: input.title || "New Conversation",
          systemPrompt: input.systemPrompt,
          isArchived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.warn("[AI Chat] Failed to create conversation record:", error);
      }

      return {
        success: true,
        conversationId,
        title: input.title || "New Conversation",
        createdAt: new Date().toISOString(),
      };
    }),

  /**
   * Delete a conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      try {
        const db = getDb();
        // Delete all messages in the conversation
        await db
          .delete(conversationHistory)
          .where(
            (t: any) =>
              t.conversationId === input.conversationId &&
              t.tenantId === tenant.id
          );

        // Delete conversation record
        await db
          .delete(conversations)
          .where(
            (t: any) =>
              t.id === input.conversationId &&
              t.tenantId === tenant.id
          );

        return { success: true };
      } catch (error) {
        console.error("[AI Chat] Delete failed:", error);
        return { success: false };
      }
    }),
});
