import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { handleMailerLiteWebhook, validateMailerLiteSignature, processBatchWebhookEvents } from "./webhookHandler";

export const webhookRouter = router({
  /**
   * Handle MailerLite webhook events
   * POST /api/trpc/webhooks.handleMailerLite
   */
  handleMailerLite: publicProcedure
    .input(
      z.object({
        type: z.enum([
          "subscriber.opened_email",
          "subscriber.clicked_link",
          "subscriber.bounced_email",
          "subscriber.unsubscribed",
        ]),
        data: z.object({
          subscriber: z.object({
            email: z.string().email(),
            id: z.string(),
          }),
          campaign: z
            .object({
              id: z.string(),
              name: z.string(),
            })
            .optional(),
          timestamp: z.string().optional(),
          link: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const success = await handleMailerLiteWebhook({
          type: input.type,
          data: input.data,
        });

        return {
          success,
          message: success ? "Webhook processed successfully" : "Failed to process webhook",
        };
      } catch (error) {
        console.error("Error in handleMailerLite:", error);
        return {
          success: false,
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Validate webhook signature
   * POST /api/trpc/webhooks.validateSignature
   */
  validateSignature: publicProcedure
    .input(
      z.object({
        payload: z.string(),
        signature: z.string(),
        apiKey: z.string(),
      })
    )
    .query(({ input }) => {
      try {
        const isValid = validateMailerLiteSignature(input.payload, input.signature, input.apiKey);
        return {
          success: true,
          isValid,
          message: isValid ? "Signature is valid" : "Signature is invalid",
        };
      } catch (error) {
        console.error("Error validating signature:", error);
        return {
          success: false,
          isValid: false,
          message: "Error validating signature",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Process batch webhook events
   * POST /api/trpc/webhooks.processBatch
   */
  processBatch: publicProcedure
    .input(
      z.object({
        events: z.array(
          z.object({
            type: z.enum([
              "subscriber.opened_email",
              "subscriber.clicked_link",
              "subscriber.bounced_email",
              "subscriber.unsubscribed",
            ]),
            data: z.object({
              subscriber: z.object({
                email: z.string().email(),
                id: z.string(),
              }),
              campaign: z
                .object({
                  id: z.string(),
                  name: z.string(),
                })
                .optional(),
              timestamp: z.string().optional(),
              link: z.string().optional(),
            }),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await processBatchWebhookEvents(input.events);
        return {
          success: true,
          processed: result.processed,
          failed: result.failed,
          message: `Processed ${result.processed} events, ${result.failed} failed`,
        };
      } catch (error) {
        console.error("Error in processBatch:", error);
        return {
          success: false,
          processed: 0,
          failed: input.events.length,
          message: "Error processing batch",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * Health check for webhook endpoint
   * GET /api/trpc/webhooks.health
   */
  health: publicProcedure.query(() => {
    return {
      success: true,
      status: "healthy",
      timestamp: new Date().toISOString(),
    };
  }),
});
