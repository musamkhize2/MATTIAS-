import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { getDb } from "../db";
import { tenants } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  scheduleWeeklyAnalyticsReport,
  scheduleMonthlyAnalyticsReport,
} from "./analyticsReportScheduler";

/**
 * Handler for scheduled weekly analytics reports
 * Called by Heartbeat scheduler at configured intervals
 */
export async function handleWeeklyAnalyticsReport(req: Request, res: Response): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);

    // Verify this is a cron request
    if (!user.isCron || !user.taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({
        error: "Database not available",
        stack: "getDb returned null",
        context: { url: req.url, taskUid: user.taskUid },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Look up the tenant by taskUid
    const tenantRows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.scheduleCronTaskUid, user.taskUid))
      .limit(1);

    if (!tenantRows || tenantRows.length === 0) {
      // Orphaned task - return 200 so Heartbeat stops retrying
      res.json({ ok: true, skipped: "orphan" });
      return;
    }

    const tenant = tenantRows[0];

    // Get notification email from tenant features
    const features = (tenant.features as any) || {};
    const notificationEmail = features.notificationEmail;

    if (!notificationEmail) {
      res.json({
        ok: true,
        skipped: "no-notification-email",
        tenantId: tenant.id,
      });
      return;
    }

    // Generate and send weekly report
    const success = await scheduleWeeklyAnalyticsReport(tenant.id, notificationEmail);

    if (success) {
      res.json({
        ok: true,
        tenantId: tenant.id,
        email: notificationEmail,
        reportType: "weekly",
      });
    } else {
      res.status(500).json({
        error: "Failed to send weekly analytics report",
        context: {
          url: req.url,
          taskUid: user.taskUid,
          tenantId: tenant.id,
          email: notificationEmail,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[Analytics Report] Weekly handler error:", error);
    res.status(500).json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handler for scheduled monthly analytics reports
 * Called by Heartbeat scheduler at configured intervals
 */
export async function handleMonthlyAnalyticsReport(req: Request, res: Response): Promise<void> {
  try {
    const user = await sdk.authenticateRequest(req);

    // Verify this is a cron request
    if (!user.isCron || !user.taskUid) {
      res.status(403).json({ error: "cron-only" });
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).json({
        error: "Database not available",
        stack: "getDb returned null",
        context: { url: req.url, taskUid: user.taskUid },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Look up the tenant by taskUid
    const tenantRows = await db
      .select()
      .from(tenants)
      .where(eq(tenants.scheduleCronTaskUid, user.taskUid))
      .limit(1);

    if (!tenantRows || tenantRows.length === 0) {
      // Orphaned task - return 200 so Heartbeat stops retrying
      res.json({ ok: true, skipped: "orphan" });
      return;
    }

    const tenant = tenantRows[0];

    // Get notification email from tenant features
    const features = (tenant.features as any) || {};
    const notificationEmail = features.notificationEmail;

    if (!notificationEmail) {
      res.json({
        ok: true,
        skipped: "no-notification-email",
        tenantId: tenant.id,
      });
      return;
    }

    // Generate and send monthly report
    const success = await scheduleMonthlyAnalyticsReport(tenant.id, notificationEmail);

    if (success) {
      res.json({
        ok: true,
        tenantId: tenant.id,
        email: notificationEmail,
        reportType: "monthly",
      });
    } else {
      res.status(500).json({
        error: "Failed to send monthly analytics report",
        context: {
          url: req.url,
          taskUid: user.taskUid,
          tenantId: tenant.id,
          email: notificationEmail,
        },
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("[Analytics Report] Monthly handler error:", error);
    res.status(500).json({
      error: String(error),
      stack: error instanceof Error ? error.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
