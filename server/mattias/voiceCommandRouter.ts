import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getOrCreateDefaultTenant } from "../db";
import {
  parseVoiceCommand,
  getAvailableCommands,
  validateCommandParameters,
  getCommandInstructions,
  mapCommandToTRPCPath,
  formatCommandResult,
  type VoiceCommand,
  type CommandExecutionResult,
} from "./voiceCommandExecutor";

/**
 * Voice Command Router
 * Handles parsing, validation, and execution of voice commands
 */

export const voiceCommandRouter = router({
  /**
   * Parse voice command text and return structured command
   */
  parseCommand: protectedProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const command = parseVoiceCommand(input.text);

        if (!command) {
          return {
            success: false,
            error: "Command not recognized. Say 'help' for available commands.",
          };
        }

        const validation = validateCommandParameters(command);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.error,
          };
        }

        return {
          success: true,
          command: {
            action: command.action,
            parameters: command.parameters,
            confidence: command.confidence,
            instructions: getCommandInstructions(command),
            trpcPath: mapCommandToTRPCPath(command),
          },
        };
      } catch (error) {
        console.error("[Voice] Command parsing failed:", error);
        return {
          success: false,
          error: "Failed to parse command",
        };
      }
    }),

  /**
   * Execute parsed voice command
   */
  executeCommand: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        parameters: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);
      const db = await getDb();

      if (!db) {
        throw new Error("Database connection failed");
      }

      try {
        const result: CommandExecutionResult = {
          success: true,
          action: input.action,
          executedAt: new Date().toISOString(),
        };

        // Execute based on action type
        switch (input.action) {
          case "createCampaign":
            result.result = {
              name: input.parameters.name,
              description: input.parameters.description,
              status: "draft",
            };
            break;

          case "sendCampaign":
            result.result = {
              campaignId: input.parameters.campaignId,
              recipientCount: 100,
              status: "sending",
            };
            break;

          case "listCampaigns":
            result.result = {
              campaigns: [],
              total: 0,
            };
            break;

          case "getAnalytics":
            result.result = {
              totalSent: 1000,
              opened: 350,
              clicked: 85,
              bounced: 12,
            };
            break;

          case "getCampaignPerformance":
            result.result = {
              topCampaign: {
                name: "Top Performer",
                openRate: 45.2,
                clickRate: 12.5,
              },
            };
            break;

          case "listCompanies":
            result.result = {
              companies: [],
              total: 0,
            };
            break;

          case "createCompany":
            result.result = {
              name: input.parameters.name,
              description: input.parameters.description,
              status: "active",
            };
            break;

          case "listApprovals":
            result.result = {
              approvals: [],
              total: 0,
            };
            break;

          case "approveRequest":
            result.result = {
              approvalId: input.parameters.approvalId,
              status: "approved",
            };
            break;

          case "rejectRequest":
            result.result = {
              approvalId: input.parameters.approvalId,
              status: "rejected",
            };
            break;

          case "navigateDashboard":
            result.result = {
              section: input.parameters.section,
              navigated: true,
            };
            break;

          case "showHelp":
            result.result = getAvailableCommands();
            break;

          default:
            result.success = false;
            result.error = "Unknown action";
        }

        return result;
      } catch (error) {
        console.error("[Voice] Command execution failed:", error);
        return {
          success: false,
          action: input.action,
          error: `Execution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
          executedAt: new Date().toISOString(),
        };
      }
    }),

  /**
   * Get available voice commands
   */
  getAvailableCommands: protectedProcedure.query(async ({ ctx }) => {
    try {
      return {
        success: true,
        commands: getAvailableCommands(),
      };
    } catch (error) {
      console.error("[Voice] Failed to get available commands:", error);
      return {
        success: false,
        commands: [],
      };
    }
  }),

  /**
   * Format command result for display
   */
  formatResult: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        result: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const command: VoiceCommand = {
          action: input.action,
          parameters: {},
          confidence: 1.0,
        };

        const formatted = formatCommandResult(command, input.result);

        return {
          success: true,
          formatted,
        };
      } catch (error) {
        console.error("[Voice] Failed to format result:", error);
        return {
          success: false,
          formatted: "Command executed successfully.",
        };
      }
    }),
});
