import { getDomainConfig } from "./domainConfig";
import { sendTransactionalEmail } from "./mailerliteTransactional";

export interface NotificationPayload {
  title: string;
  message: string;
  type: "campaign_delivery_failure" | "approval_pending" | "analytics_report" | "system_alert";
  metadata?: Record<string, any>;
}

/**
 * Send Slack notification
 */
export async function sendSlackNotification(
  slackWebhookUrl: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const color = getColorForType(payload.type);
    const slackPayload = {
      attachments: [
        {
          color,
          title: payload.title,
          text: payload.message,
          footer: "MATTIAS AI Operating System",
          ts: Math.floor(Date.now() / 1000),
          fields: payload.metadata
            ? Object.entries(payload.metadata).map(([key, value]) => ({
                title: key,
                value: String(value),
                short: true,
              }))
            : [],
        },
      ],
    };

    const response = await fetch(slackWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      console.error(`[Slack] Failed to send notification: ${response.statusText}`);
      return false;
    }

    console.log(`[Slack] Notification sent: ${payload.title}`);
    return true;
  } catch (error) {
    console.error("[Slack] Error sending notification:", error);
    return false;
  }
}

/**
 * Send email notification via MailerLite
 */
export async function sendEmailNotification(
  recipientEmail: string,
  payload: NotificationPayload
): Promise<boolean> {
  try {
    const emailBody = formatEmailBody(payload);

    const result = await sendTransactionalEmail({
      to: [recipientEmail],
      subject: `[${payload.type.toUpperCase()}] ${payload.title}`,
      html: emailBody,
    });

    if (result.success) {
      console.log(`[Email] Notification sent to ${recipientEmail}: ${payload.title}`);
      return true;
    } else {
      console.error(`[Email] Failed to send notification to ${recipientEmail}`);
      return false;
    }
  } catch (error) {
    console.error("[Email] Error sending notification:", error);
    return false;
  }
}

/**
 * Send notification to tenant (both Slack and Email)
 */
export async function sendTenantNotification(
  tenantId: number,
  payload: NotificationPayload
): Promise<{ slack: boolean; email: boolean }> {
  try {
    const config = await getDomainConfig(tenantId);

    const results = {
      slack: false,
      email: false,
    };

    // Send Slack notification if configured
    if (config.slackWebhookUrl) {
      results.slack = await sendSlackNotification(config.slackWebhookUrl, payload);
    }

    // Send email notification if configured
    if (config.notificationEmail) {
      results.email = await sendEmailNotification(config.notificationEmail, payload);
    }

    return results;
  } catch (error) {
    console.error("[Notification] Error sending tenant notification:", error);
    return { slack: false, email: false };
  }
}

/**
 * Get color for notification type
 */
function getColorForType(type: string): string {
  switch (type) {
    case "campaign_delivery_failure":
      return "#FF0000"; // Red
    case "approval_pending":
      return "#FFA500"; // Orange
    case "analytics_report":
      return "#0099FF"; // Blue
    case "system_alert":
      return "#FFFF00"; // Yellow
    default:
      return "#808080"; // Gray
  }
}

/**
 * Format notification as HTML email
 */
function formatEmailBody(payload: NotificationPayload): string {
  const metadataHtml = payload.metadata
    ? Object.entries(payload.metadata)
        .map(([key, value]) => `<tr><td><strong>${key}:</strong></td><td>${String(value)}</td></tr>`)
        .join("")
    : "";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0066cc; color: white; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
          .content { background-color: #f5f5f5; padding: 20px; border-radius: 4px; margin-bottom: 20px; }
          .metadata { width: 100%; border-collapse: collapse; }
          .metadata td { padding: 8px; border-bottom: 1px solid #ddd; }
          .footer { color: #666; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${payload.title}</h2>
          </div>
          <div class="content">
            <p>${payload.message}</p>
            ${
              metadataHtml
                ? `
              <table class="metadata">
                ${metadataHtml}
              </table>
            `
                : ""
            }
          </div>
          <div class="footer">
            <p>This is an automated notification from MATTIAS AI Operating System</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Send campaign delivery failure notification
 */
export async function notifyCampaignDeliveryFailure(
  tenantId: number,
  campaignId: string,
  campaignName: string,
  failureCount: number,
  totalRecipients: number
): Promise<{ slack: boolean; email: boolean }> {
  const failureRate = ((failureCount / totalRecipients) * 100).toFixed(2);

  return sendTenantNotification(tenantId, {
    title: `Campaign Delivery Failure: ${campaignName}`,
    message: `${failureCount} out of ${totalRecipients} emails failed to deliver (${failureRate}% failure rate).`,
    type: "campaign_delivery_failure",
    metadata: {
      campaignId,
      campaignName,
      failureCount,
      totalRecipients,
      failureRate: `${failureRate}%`,
    },
  });
}

/**
 * Send approval pending notification
 */
export async function notifyApprovalPending(
  tenantId: number,
  approvalId: string,
  actionType: string,
  riskScore: number
): Promise<{ slack: boolean; email: boolean }> {
  return sendTenantNotification(tenantId, {
    title: `Approval Required: ${actionType}`,
    message: `An action requires your approval. Risk score: ${riskScore}/10000.`,
    type: "approval_pending",
    metadata: {
      approvalId,
      actionType,
      riskScore,
    },
  });
}

/**
 * Send analytics report notification
 */
export async function notifyAnalyticsReport(
  tenantId: number,
  reportPeriod: string,
  campaignCount: number,
  totalEmails: number,
  openRate: number,
  clickRate: number
): Promise<{ slack: boolean; email: boolean }> {
  return sendTenantNotification(tenantId, {
    title: `Weekly Analytics Report: ${reportPeriod}`,
    message: `Your weekly analytics report is ready. ${campaignCount} campaigns, ${totalEmails} emails sent.`,
    type: "analytics_report",
    metadata: {
      campaignCount,
      totalEmails,
      openRate: `${openRate.toFixed(2)}%`,
      clickRate: `${clickRate.toFixed(2)}%`,
    },
  });
}
