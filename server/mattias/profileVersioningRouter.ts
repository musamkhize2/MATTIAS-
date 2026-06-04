import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { getOrCreateDefaultTenant } from '../db';

/**
 * Profile Versioning Router
 * Manages profile versions and rollback functionality
 */

interface ProfileVersion {
  id: string;
  profileId: string;
  tenantId: number;
  userId: number;
  versionNumber: number;
  name: string;
  description?: string;
  triggerPhrase: string;
  commands: any[];
  changeLog?: string;
  createdAt: string;
}

// In-memory storage for demo
const profileVersionsStore = new Map<string, ProfileVersion[]>();

export const profileVersioningRouter = router({
  /**
   * Create a new version of a profile
   */
  createVersion: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        triggerPhrase: z.string(),
        commands: z.array(z.record(z.any())),
        changeLog: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      try {
        const versions = profileVersionsStore.get(input.profileId) || [];
        const versionNumber = versions.length + 1;
        const versionId = `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const newVersion: ProfileVersion = {
          id: versionId,
          profileId: input.profileId,
          tenantId: tenant.id,
          userId: ctx.user.id,
          versionNumber,
          name: input.name,
          description: input.description,
          triggerPhrase: input.triggerPhrase,
          commands: input.commands,
          changeLog: input.changeLog,
          createdAt: new Date().toISOString(),
        };

        versions.push(newVersion);
        profileVersionsStore.set(input.profileId, versions);

        return {
          success: true,
          versionId,
          versionNumber,
          message: `Version ${versionNumber} created`,
        };
      } catch (error) {
        console.error('[ProfileVersioning] Create version failed:', error);
        return {
          success: false,
          error: 'Failed to create version',
        };
      }
    }),

  /**
   * Get all versions of a profile
   */
  listVersions: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const versions = profileVersionsStore.get(input.profileId) || [];

        // Filter by tenant/user
        const userVersions = versions.filter(
          (v) => v.tenantId === (await getOrCreateDefaultTenant(ctx.user.id)).id
        );

        const paginatedVersions = userVersions
          .sort((a, b) => b.versionNumber - a.versionNumber)
          .slice(input.offset, input.offset + input.limit);

        return {
          success: true,
          versions: paginatedVersions,
          total: userVersions.length,
        };
      } catch (error) {
        console.error('[ProfileVersioning] List versions failed:', error);
        return {
          success: false,
          versions: [],
          total: 0,
        };
      }
    }),

  /**
   * Get a specific version
   */
  getVersion: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        versionNumber: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const versions = profileVersionsStore.get(input.profileId) || [];
        const version = versions.find((v) => v.versionNumber === input.versionNumber);

        if (!version) {
          return {
            success: false,
            error: 'Version not found',
          };
        }

        return {
          success: true,
          version,
        };
      } catch (error) {
        console.error('[ProfileVersioning] Get version failed:', error);
        return {
          success: false,
          error: 'Failed to fetch version',
        };
      }
    }),

  /**
   * Compare two versions
   */
  compareVersions: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        version1: z.number(),
        version2: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const versions = profileVersionsStore.get(input.profileId) || [];
        const v1 = versions.find((v) => v.versionNumber === input.version1);
        const v2 = versions.find((v) => v.versionNumber === input.version2);

        if (!v1 || !v2) {
          return {
            success: false,
            error: 'One or both versions not found',
          };
        }

        // Simple diff
        const diff = {
          nameChanged: v1.name !== v2.name,
          triggerPhraseChanged: v1.triggerPhrase !== v2.triggerPhrase,
          commandsChanged: JSON.stringify(v1.commands) !== JSON.stringify(v2.commands),
          changes: {
            name: { old: v1.name, new: v2.name },
            triggerPhrase: { old: v1.triggerPhrase, new: v2.triggerPhrase },
            commandCount: { old: v1.commands.length, new: v2.commands.length },
          },
        };

        return {
          success: true,
          version1: v1,
          version2: v2,
          diff,
        };
      } catch (error) {
        console.error('[ProfileVersioning] Compare versions failed:', error);
        return {
          success: false,
          error: 'Failed to compare versions',
        };
      }
    }),

  /**
   * Rollback to a specific version
   */
  rollbackToVersion: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        versionNumber: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      try {
        const versions = profileVersionsStore.get(input.profileId) || [];
        const targetVersion = versions.find((v) => v.versionNumber === input.versionNumber);

        if (!targetVersion) {
          return {
            success: false,
            error: 'Target version not found',
          };
        }

        // Create a new version from the rollback
        const newVersionNumber = versions.length + 1;
        const newVersionId = `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const rollbackVersion: ProfileVersion = {
          id: newVersionId,
          profileId: input.profileId,
          tenantId: tenant.id,
          userId: ctx.user.id,
          versionNumber: newVersionNumber,
          name: targetVersion.name,
          description: targetVersion.description,
          triggerPhrase: targetVersion.triggerPhrase,
          commands: targetVersion.commands,
          changeLog: `Rolled back from version ${input.versionNumber}. Reason: ${input.reason || 'No reason provided'}`,
          createdAt: new Date().toISOString(),
        };

        versions.push(rollbackVersion);
        profileVersionsStore.set(input.profileId, versions);

        return {
          success: true,
          newVersionNumber,
          message: `Rolled back to version ${input.versionNumber}. New version: ${newVersionNumber}`,
        };
      } catch (error) {
        console.error('[ProfileVersioning] Rollback failed:', error);
        return {
          success: false,
          error: 'Failed to rollback',
        };
      }
    }),

  /**
   * Get version history timeline
   */
  getTimeline: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const versions = profileVersionsStore.get(input.profileId) || [];

        const timeline = versions
          .sort((a, b) => a.versionNumber - b.versionNumber)
          .map((v) => ({
            versionNumber: v.versionNumber,
            name: v.name,
            createdAt: v.createdAt,
            changeLog: v.changeLog,
            commandCount: v.commands.length,
          }));

        return {
          success: true,
          timeline,
          total: timeline.length,
        };
      } catch (error) {
        console.error('[ProfileVersioning] Get timeline failed:', error);
        return {
          success: false,
          timeline: [],
          total: 0,
        };
      }
    }),

  /**
   * Delete a version
   */
  deleteVersion: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        versionNumber: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const versions = profileVersionsStore.get(input.profileId) || [];

        // Don't allow deleting the only version
        if (versions.length <= 1) {
          return {
            success: false,
            error: 'Cannot delete the only version',
          };
        }

        const filtered = versions.filter((v) => v.versionNumber !== input.versionNumber);
        profileVersionsStore.set(input.profileId, filtered);

        return {
          success: true,
          message: 'Version deleted',
        };
      } catch (error) {
        console.error('[ProfileVersioning] Delete version failed:', error);
        return {
          success: false,
          error: 'Failed to delete version',
        };
      }
    }),

  /**
   * Get version statistics
   */
  getStats: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const versions = profileVersionsStore.get(input.profileId) || [];

        if (versions.length === 0) {
          return {
            success: true,
            stats: {
              totalVersions: 0,
              latestVersion: null,
              oldestVersion: null,
              averageCommandsPerVersion: 0,
            },
          };
        }

        const sorted = [...versions].sort((a, b) => a.versionNumber - b.versionNumber);
        const avgCommands =
          versions.reduce((sum, v) => sum + v.commands.length, 0) / versions.length;

        return {
          success: true,
          stats: {
            totalVersions: versions.length,
            latestVersion: sorted[sorted.length - 1],
            oldestVersion: sorted[0],
            averageCommandsPerVersion: Math.round(avgCommands),
          },
        };
      } catch (error) {
        console.error('[ProfileVersioning] Get stats failed:', error);
        return {
          success: false,
          stats: null,
        };
      }
    }),

  /**
   * Export version as JSON
   */
  exportVersion: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        versionNumber: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const versions = profileVersionsStore.get(input.profileId) || [];
        const version = versions.find((v) => v.versionNumber === input.versionNumber);

        if (!version) {
          return {
            success: false,
            error: 'Version not found',
          };
        }

        return {
          success: true,
          export: {
            profileId: version.profileId,
            versionNumber: version.versionNumber,
            name: version.name,
            description: version.description,
            triggerPhrase: version.triggerPhrase,
            commands: version.commands,
            createdAt: version.createdAt,
          },
        };
      } catch (error) {
        console.error('[ProfileVersioning] Export failed:', error);
        return {
          success: false,
          error: 'Failed to export version',
        };
      }
    }),
});
