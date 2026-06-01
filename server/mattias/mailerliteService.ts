/**
 * MailerLite Email Service Integration
 * Handles real email sending via MailerLite API
 */

export interface MailerLiteContact {
  email: string;
  name?: string;
  fields?: Record<string, string>;
  tags?: string[];
}

export interface MailerLiteEmailPayload {
  to: MailerLiteContact[];
  from: {
    name: string;
    email: string;
  };
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: string[];
}

export interface MailerLiteResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

const MAILERLITE_API_BASE = "https://connect.mailerlite.com/api";
const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;

/**
 * Get MailerLite API headers
 */
function getMailerLiteHeaders(): Record<string, string> {
  if (!MAILERLITE_API_KEY) {
    throw new Error("MAILERLITE_API_KEY environment variable not set");
  }

  return {
    "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * Send email via MailerLite API
 */
export async function sendEmailViaMailerLite(
  payload: MailerLiteEmailPayload
): Promise<MailerLiteResponse> {
  try {
    if (!MAILERLITE_API_KEY) {
      console.error("[MAILERLITE] API key not configured");
      return {
        success: false,
        error: "MailerLite API key not configured",
        timestamp: new Date(),
      };
    }

    console.log("[MAILERLITE] Sending email via MailerLite", {
      to: payload.to.map((c) => c.email),
      subject: payload.subject,
      from: payload.from.email,
    });

    // Create email campaign via MailerLite API
    // MailerLite uses a campaign-based approach for sending
    const campaignPayload = {
      name: `Campaign_${Date.now()}`,
      type: "regular",
      subject: payload.subject,
      from_name: payload.from.name,
      from_email: payload.from.email,
      reply_to_email: payload.replyTo || payload.from.email,
      content: {
        html: payload.html,
        plain_text: payload.text || stripHtml(payload.html),
      },
      emails: payload.to.map((c) => ({
        email: c.email,
        from: payload.from.email,
      })),
    };

    // First, add subscribers to a temporary list
    const subscriberIds: string[] = [];

    for (const contact of payload.to) {
      try {
        const subscriberResponse = await fetch(
          `${MAILERLITE_API_BASE}/subscribers`,
          {
            method: "POST",
            headers: getMailerLiteHeaders(),
            body: JSON.stringify({
              email: contact.email,
              name: contact.name || contact.email,
              fields: contact.fields || {},
              tags: contact.tags || ["campaign"],
              status: "active",
            }),
          }
        );

        if (subscriberResponse.ok) {
          const subscriberData = await subscriberResponse.json();
          subscriberIds.push(subscriberData.data.id);
          console.log(`[MAILERLITE] Added subscriber: ${contact.email}`);
        } else {
          console.warn(
            `[MAILERLITE] Failed to add subscriber ${contact.email}:`,
            subscriberResponse.statusText
          );
        }
      } catch (error) {
        console.error(`[MAILERLITE] Error adding subscriber ${contact.email}:`, error);
      }
    }

    if (subscriberIds.length === 0) {
      return {
        success: false,
        error: "No subscribers were added successfully",
        timestamp: new Date(),
      };
    }

    // Send campaign to subscribers
    const campaignResponse = await fetch(`${MAILERLITE_API_BASE}/campaigns`, {
      method: "POST",
      headers: getMailerLiteHeaders(),
      body: JSON.stringify(campaignPayload),
    });

    if (!campaignResponse.ok) {
      const errorData = await campaignResponse.json();
      console.error("[MAILERLITE] Campaign creation failed:", errorData);
      return {
        success: false,
        error: `Campaign creation failed: ${campaignResponse.statusText}`,
        timestamp: new Date(),
      };
    }

    const campaignData = await campaignResponse.json();
    const campaignId = campaignData.data.id;

    // Send the campaign
    const sendResponse = await fetch(
      `${MAILERLITE_API_BASE}/campaigns/${campaignId}/send`,
      {
        method: "POST",
        headers: getMailerLiteHeaders(),
        body: JSON.stringify({
          recipients: {
            subscriber_ids: subscriberIds,
          },
        }),
      }
    );

    if (!sendResponse.ok) {
      const errorData = await sendResponse.json();
      console.error("[MAILERLITE] Send failed:", errorData);
      return {
        success: false,
        error: `Send failed: ${sendResponse.statusText}`,
        timestamp: new Date(),
      };
    }

    const messageId = `mailerlite_${campaignId}_${Date.now()}`;

    console.log("[MAILERLITE] ✓ Email sent successfully", {
      messageId,
      campaignId,
      recipientCount: subscriberIds.length,
      subject: payload.subject,
    });

    return {
      success: true,
      messageId,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("[MAILERLITE] Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

/**
 * Get subscriber by email
 */
export async function getSubscriberByEmail(
  email: string
): Promise<Record<string, any> | null> {
  try {
    const response = await fetch(
      `${MAILERLITE_API_BASE}/subscribers?filter[email]=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: getMailerLiteHeaders(),
      }
    );

    if (!response.ok) {
      console.error("[MAILERLITE] Failed to get subscriber:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data.data && data.data.length > 0 ? data.data[0] : null;
  } catch (error) {
    console.error("[MAILERLITE] Error getting subscriber:", error);
    return null;
  }
}

/**
 * Get campaign stats
 */
export async function getCampaignStats(
  campaignId: string
): Promise<Record<string, any> | null> {
  try {
    const response = await fetch(
      `${MAILERLITE_API_BASE}/campaigns/${campaignId}/stats`,
      {
        method: "GET",
        headers: getMailerLiteHeaders(),
      }
    );

    if (!response.ok) {
      console.error("[MAILERLITE] Failed to get campaign stats:", response.statusText);
      return null;
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("[MAILERLITE] Error getting campaign stats:", error);
    return null;
  }
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}
