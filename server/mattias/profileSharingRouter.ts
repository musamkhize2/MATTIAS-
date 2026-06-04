import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { protectedProcedure, router } from '../_core/trpc';
import { getDb, getOrCreateDefaultTenant } from '../db';

/**
 * Profile Sharing Router
 * Manages profile sharing and role-based access control
 */

type ShareRole = 'viewer' | 'executor' | 'editor' | 'admin';

interface ProfileShare {
  id: string;
  profileId: string;
  tenantId: number;
  ownerId: number;
  sharedWithUserId?: number;
  sharedWithTeamId?: number;
  role: ShareRole;
  sharedAt: string;
  expiresAt?: string;
  createdAt: string;
}

// In-memory storage for demo (replace with database in production)
const profileSharesStore = new Map<string, ProfileShare>();

const roleHierarchy: Record<ShareRole, number> = {
  viewer: 1,
  executor: 2,
  editor: 3,
  admin: 4,
};

const rolePermissions: Record<ShareRole, string[]> = {
  viewer: ['view', 'viewAnalytics'],
  executor: ['view', 'viewAnalytics', 'execute'],
  editor: ['view', 'viewAnalytics', 'execute', 'edit', 'updateCommands'],
  admin: ['view', 'viewAnalytics', 'execute', 'edit', 'updateCommands', 'share', 'delete'],
};

export const profileSharingRouter = router({
  /**
   * Share a profile with a user
   */
  shareWithUser: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        userId: z.number(),
        role: z.enum(['viewer', 'executor', 'editor', 'admin']),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      try {
        const shareId = `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const share: ProfileShare = {
          id: shareId,
          profileId: input.profileId,
          tenantId: tenant.id,
          ownerId: ctx.user.id,
          sharedWithUserId: input.userId,
          role: input.role,
          sharedAt: new Date().toISOString(),
          expiresAt: input.expiresAt,
          createdAt: new Date().toISOString(),
        };

        profileSharesStore.set(shareId, share);

        return {
          success: true,
          shareId,
          message: `Profile shared with user ${input.userId} as ${input.role}`,
        };
      } catch (error) {
        console.error('[ProfileSharing] Share failed:', error);
        return {
          success: false,
          error: 'Failed to share profile',
        };
      }
    }),

  /**
   * Share a profile with a team
   */
  shareWithTeam: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        teamId: z.number(),
        role: z.enum(['viewer', 'executor', 'editor', 'admin']),
        expiresAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      try {
        const shareId = `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const share: ProfileShare = {
          id: shareId,
          profileId: input.profileId,
          tenantId: tenant.id,
          ownerId: ctx.user.id,
          sharedWithTeamId: input.teamId,
          role: input.role,
          sharedAt: new Date().toISOString(),
          expiresAt: input.expiresAt,
          createdAt: new Date().toISOString(),
        };

        profileSharesStore.set(shareId, share);

        return {
          success: true,
          shareId,
          message: `Profile shared with team ${input.teamId} as ${input.role}`,
        };
      } catch (error) {
        console.error('[ProfileSharing] Share failed:', error);
        return {
          success: false,
          error: 'Failed to share profile',
        };
      }
    }),

  /**
   * Get all shares for a profile
   */
  getShares: protectedProcedure
    .input(z.object({ profileId: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenant = await getOrCreateDefaultTenant(ctx.user.id);

      try {
        const shares = Array.from(profileSharesStore.values()).filter(
          (s) =>
            s.profileId === input.profileId &&
            s.tenantId === tenant.id &&
            s.ownerId === ctx.user.id
        );

        // Filter out expired shares
        const activeShares = shares.filter((s) => {
          if (!s.expiresAt) return true;
          return new Date(s.expiresAt) > new Date();
        });

        return {
          success: true,
          shares: activeShares,
          total: activeShares.length,
        };
      } catch (error) {
        console.error('[ProfileSharing] Get shares failed:', error);
        return {
          success: false,
          shares: [],
          total: 0,
        };
      }
    }),

  /**
   * Revoke a share
   */
  revokeShare: protectedProcedure
    .input(z.object({ shareId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const share = profileSharesStore.get(input.shareId);

        if (!share || share.ownerId !== ctx.user.id) {
          return {
            success: false,
            error: 'Share not found or unauthorized',
          };
        }

        profileSharesStore.delete(input.shareId);

        return {
          success: true,
          message: 'Share revoked',
        };
      } catch (error) {
        console.error('[ProfileSharing] Revoke failed:', error);
        return {
          success: false,
          error: 'Failed to revoke share',
        };
      }
    }),

  /**
   * Update share role
   */
  updateShareRole: protectedProcedure
    .input(
      z.object({
        shareId: z.string(),
        role: z.enum(['viewer', 'executor', 'editor', 'admin']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const share = profileSharesStore.get(input.shareId);

        if (!share || share.ownerId !== ctx.user.id) {
          return {
            success: false,
            error: 'Share not found or unauthorized',
          };
        }

        share.role = input.role;
        profileSharesStore.set(input.shareId, share);

        return {
          success: true,
          message: `Share role updated to ${input.role}`,
        };
      } catch (error) {
        console.error('[ProfileSharing] Update role failed:', error);
        return {
          success: false,
          error: 'Failed to update share role',
        };
      }
    }),

  /**
   * Check if user has permission for action
   */
  checkPermission: protectedProcedure
    .input(
      z.object({
        profileId: z.string(),
        action: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Owner has all permissions
        // TODO: Check if user owns the profile

        // Check shares
        const shares = Array.from(profileSharesStore.values()).filter(
          (s) =>
            s.profileId === input.profileId &&
            (s.sharedWithUserId === ctx.user.id ||
              s.sharedWithTeamId) // TODO: Check team membership
        );

        // Filter active shares
        const activeShares = shares.filter((s) => {
          if (!s.expiresAt) return true;
          return new Date(s.expiresAt) > new Date();
        });

        if (activeShares.length === 0) {
          return {
            success: true,
            hasPermission: false,
            reason: 'No active shares found',
          };
        }

        // Get highest role
        const highestRole = activeShares.reduce((max, s) => {
          return roleHierarchy[s.role] > roleHierarchy[max] ? s.role : max;
        }, 'viewer' as ShareRole);

        const permissions = rolePermissions[highestRole];
        const hasPermission = permissions.includes(input.action);

        return {
          success: true,
          hasPermission,
          role: highestRole,
          permissions,
          reason: hasPermission ? 'Permission granted' : 'Permission denied',
        };
      } catch (error) {
        console.error('[ProfileSharing] Check permission failed:', error);
        return {
          success: false,
          hasPermission: false,
          reason: 'Error checking permissions',
        };
      }
    }),

  /**
   * Get shared profiles for current user
   */
  getSharedWithMe: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const shares = Array.from(profileSharesStore.values()).filter(
          (s) =>
            s.sharedWithUserId === ctx.user.id &&
            (!s.expiresAt || new Date(s.expiresAt) > new Date())
        );

        const paginatedShares = shares.slice(input.offset, input.offset + input.limit);

        // Group by profile
        const grouped = paginatedShares.reduce(
          (acc, share) => {
            if (!acc[share.profileId]) {
              acc[share.profileId] = [];
            }
            acc[share.profileId].push(share);
            return acc;
          },
          {} as Record<string, ProfileShare[]>
        );

        return {
          success: true,
          sharedProfiles: grouped,
          total: shares.length,
        };
      } catch (error) {
        console.error('[ProfileSharing] Get shared failed:', error);
        return {
          success: false,
          sharedProfiles: {},
          total: 0,
        };
      }
    }),

  /**
   * Get role details and permissions
   */
  getRoleInfo: protectedProcedure
    .input(z.object({ role: z.enum(['viewer', 'executor', 'editor', 'admin']) }))
    .query(async ({ input }) => {
      const roleDescriptions: Record<ShareRole, string> = {
        viewer: 'Can view profile details and analytics',
        executor: 'Can view, execute profiles, and view results',
        editor: 'Can view, execute, and modify profile commands',
        admin: 'Full access including sharing and deletion',
      };

      return {
        success: true,
        role: input.role,
        description: roleDescriptions[input.role],
        permissions: rolePermissions[input.role],
        hierarchy: roleHierarchy[input.role],
      };
    }),
});
