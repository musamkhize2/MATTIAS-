/**
 * MailerLite Transactional Email Service
 * Simplified API for sending transactional emails
 */

export interface TransactionalEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface TransactionalEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;

/**
 * Send transactional email via MailerLite
 * This uses the simpler transactional API endpoint
 */
export async function sendTransactionalEmail(
  payload: TransactionalEmailPayload
): Promise<TransactionalEmailResponse> {
  try {
    if (!MAILERLITE_API_KEY) {
      console.error("[MAILERLITE] API key not configured");
      return {
        success: false,
        error: "MailerLite API key not configured",
        timestamp: new Date(),
      };
    }

    const toEmails = Array.isArray(payload.to) ? payload.to : [payload.to];

    console.log("[MAILERLITE] Sending transactional email", {
      to: toEmails,
      subject: payload.subject,
    });

    // Use MailerLite's transactional API
    const response = await fetch("https://api.mailerlite.com/api/v1/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${MAILERLITE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: toEmails.map((email) => ({ email })),
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        from: {
          email: payload.from || "noreply@mattias.ai",
          name: "MATTIAS",
        },
        reply_to: payload.replyTo,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[MAILERLITE] Email send failed:", errorData);
      return {
        success: false,
        error: `Email send failed: ${response.statusText}`,
        timestamp: new Date(),
      };
    }

    const data = await response.json();
    const messageId = `mailerlite_${Date.now()}`;

    console.log("[MAILERLITE] ✓ Transactional email sent successfully", {
      messageId,
      recipientCount: toEmails.length,
      subject: payload.subject,
    });

    return {
      success: true,
      messageId,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("[MAILERLITE] Error sending transactional email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

/**
 * Send email to single recipient
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<TransactionalEmailResponse> {
  return sendTransactionalEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Send email to multiple recipients
 */
export async function sendEmailBatch(
  recipients: string[],
  subject: string,
  html: string,
  text?: string
): Promise<TransactionalEmailResponse> {
  return sendTransactionalEmail({
    to: recipients,
    subject,
    html,
    text,
  });
}
