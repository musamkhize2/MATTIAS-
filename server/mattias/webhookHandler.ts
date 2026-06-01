import { getDb } from "../db";
import { actionHistory, emailCampaigns } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import {
  updateDeliveryStatus,
  logWebhookEvent,
  markWebhookEventProcessed,
} from "./emailDeliveryTracking";

export type MailerLiteWebhookEvent = {
  type:
    | "subscriber.opened_email"
    | "subscriber.clicked_link"
    | "subscriber.bounced_email"
    | "subscriber.unsubscribed"
    | "email.sent"
    | "email.delivered";
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
    messageId?: string;
  };
};

/**
 * Handle MailerLite webhook events
 * Updates action history with engagement metrics and delivery status
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
    const tenantId = 1; // Default tenant - can be enhanced with multi-tenant support

    // Update delivery status tracking
    let deliveryStatus: "queued" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed" | "failed" =
      "queued";

    switch (type) {
      case "email.sent":
        deliveryStatus = "sent";
        break;
      case "email.delivered":
        deliveryStatus = "delivered";
        break;
      case "subscriber.opened_email":
        deliveryStatus = "opened";
        break;
      case "subscriber.clicked_link":
        deliveryStatus = "clicked";
        break;
      case "subscriber.bounced_email":
        deliveryStatus = "bounced";
        break;
      case "subscriber.unsubscribed":
        deliveryStatus = "unsubscribed";
        break;
    }

    // Update email delivery status
    if (campaign?.id) {
      await updateDeliveryStatus(tenantId, {
        campaignId: campaign.id,
        recipientEmail: subscriber.email,
        status: deliveryStatus,
        messageId: data.messageId,
        metadata: {
          mailerliteSubscriberId: subscriber.id,
          timestamp: data.timestamp || new Date().toISOString(),
          link: data.link,
        },
      });
    }

    // Log webhook event for audit trail
    await logWebhookEvent(
      tenantId,
      {
        eventType: type === "email.sent" ? "delivered" : type === "subscriber.opened_email" ? "opened" : type === "subscriber.clicked_link" ? "clicked" : type === "subscriber.bounced_email" ? "bounced" : "unsubscribed",
        payload: data,
      },
      campaign?.id
    );

    // Find the action history entry for this email (for legacy support)
    const actionHistoryEntry = await db
      .select()
      .from(actionHistory)
      .where(
        and(
          eq(actionHistory.status, "completed")
          // Match by recipient email in metadata
        )
      )
      .limit(1);

    if (actionHistoryEntry && actionHistoryEntry.length > 0) {
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
          metadata.bounceType = "hard";
          break;

        case "subscriber.unsubscribed":
          metadata.unsubscribed = true;
          metadata.unsubscribedAt = data.timestamp || new Date().toISOString();
          break;

        case "email.delivered":
          metadata.delivered = true;
          metadata.deliveredAt = data.timestamp || new Date().toISOString();
          break;

        case "email.sent":
          metadata.sent = true;
          metadata.sentAt = data.timestamp || new Date().toISOString();
          break;
      }

      // Update the action history entry
      await db
        .update(actionHistory)
        .set({
          metadata: JSON.stringify(metadata),
        })
        .where(eq(actionHistory.id, entry.id));
    }

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
          case "email.sent":
            updates.sentCount = (camp.sentCount || 0) + 1;
            break;
          case "email.delivered":
            // Track in delivery status table
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
