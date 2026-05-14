import { getDb } from "../db";
import { actionHistory, emailCampaigns } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

export type MailerLiteWebhookEvent = {
  type: "subscriber.opened_email" | "subscriber.clicked_link" | "subscriber.bounced_email" | "subscriber.unsubscribed";
  data: {
    subscriber: {
      email: string;
      id: string;
    };
    campaign?: {
      id: string;
      name: string;
    };
    timestamp?: string;
    link?: string;
  };
};

/**
 * Handle MailerLite webhook events
 * Updates action history with engagement metrics
 */
export async function handleMailerLiteWebhook(event: MailerLiteWebhookEvent): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("Database not available for webhook processing");
      return false;
    }

    const { type, data } = event;
    const { subscriber, campaign } = data;

    // Find the action history entry for this email
    const actionHistoryEntry = await db
      .select()
      .from(actionHistory)
      .where(
        and(
          eq(actionHistory.status, "completed"),
          // Match by recipient email in metadata
        )
      )
      .limit(1);

    if (!actionHistoryEntry || actionHistoryEntry.length === 0) {
      console.warn(`No action history found for email: ${subscriber.email}`);
      return false;
    }

    const entry = actionHistoryEntry[0];
    const metadata = (entry.metadata as any) || {};

    // Update metadata based on event type
    switch (type) {
      case "subscriber.opened_email":
        metadata.opened = true;
        metadata.openedAt = data.timestamp || new Date().toISOString();
        break;

      case "subscriber.clicked_link":
        metadata.clicked = true;
        metadata.clickedAt = data.timestamp || new Date().toISOString();
        metadata.clickedLink = data.link;
        break;

      case "subscriber.bounced_email":
        metadata.bounced = true;
        metadata.bouncedAt = data.timestamp || new Date().toISOString();
        metadata.bounceType = "hard"; // Can be enhanced with bounce type from MailerLite
        break;

      case "subscriber.unsubscribed":
        metadata.unsubscribed = true;
        metadata.unsubscribedAt = data.timestamp || new Date().toISOString();
        break;
    }

    // Update the action history entry
    await db
      .update(actionHistory)
      .set({
        metadata: JSON.stringify(metadata),
      })
      .where(eq(actionHistory.id, entry.id));

    // Update campaign metrics if campaign ID is provided
    if (campaign?.id) {
      const campaignData = await db
        .select()
        .from(emailCampaigns)
        .where(eq(emailCampaigns.id, campaign.id))
        .limit(1);

      if (campaignData && campaignData.length > 0) {
        const camp = campaignData[0];
        const updates: any = {};

        switch (type) {
          case "subscriber.opened_email":
            updates.openCount = (camp.openCount || 0) + 1;
            break;
          case "subscriber.clicked_link":
            updates.clickCount = (camp.clickCount || 0) + 1;
            break;
          case "subscriber.bounced_email":
            // Track bounces in metadata instead
            break;
          case "subscriber.unsubscribed":
            // Track unsubscribes in metadata instead
            break;
        }

        if (Object.keys(updates).length > 0) {
          await db
            .update(emailCampaigns)
            .set(updates)
            .where(eq(emailCampaigns.id, campaign.id));
        }
      }
    }

    console.log(`[Webhook] Processed ${type} for ${subscriber.email}`);
    return true;
  } catch (error) {
    console.error("Error handling MailerLite webhook:", error);
    return false;
  }
}

/**
 * Validate webhook signature from MailerLite
 * MailerLite signs webhooks with HMAC-SHA256
 */
export function validateMailerLiteSignature(
  payload: string,
  signature: string,
  apiKey: string
): boolean {
  try {
    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha256", apiKey)
      .update(payload)
      .digest("hex");

    return hash === signature;
  } catch (error) {
    console.error("Error validating webhook signature:", error);
    return false;
  }
}

/**
 * Process batch webhook events
 */
export async function processBatchWebhookEvents(
  events: MailerLiteWebhookEvent[]
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;

  for (const event of events) {
    const success = await handleMailerLiteWebhook(event);
    if (success) {
      processed++;
    } else {
      failed++;
    }
  }

  return { processed, failed };
}
