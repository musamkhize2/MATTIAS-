import { invokeLLM } from "../_core/llm";
import { sendEmailViaMailerLite } from "./mailerliteService";

/**
 * Email service integration with MailerLite
 * Handles email sending, templates, and campaign management
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: "outreach" | "followup" | "proposal" | "newsletter" | "alert";
  createdAt: Date;
}

export interface EmailCampaign {
  id: string;
  name: string;
  templateId: string;
  recipientCount: number;
  sentCount: number;
  openRate: number;
  clickRate: number;
  status: "draft" | "scheduled" | "sending" | "sent" | "paused";
  createdAt: Date;
  scheduledAt?: Date;
  completedAt?: Date;
}

export interface EmailRecipient {
  email: string;
  name: string;
  companyName?: string;
  variables: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: Date;
}

/**
 * Pre-built email templates for business operations
 */
export const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  COLD_OUTREACH: {
    id: "cold_outreach",
    name: "Cold Outreach",
    subject: "{{companyName}} - Partnership Opportunity",
    htmlContent: `
      <h2>Hi {{firstName}},</h2>
      <p>I've been following {{companyName}}'s growth in {{industry}} and I'm impressed with your approach to {{keyStrength}}.</p>
      <p>We help companies like yours {{valueProposition}} which typically results in {{benefit}}.</p>
      <p>Would you be open to a 15-minute call next week to explore how we might help?</p>
      <p>Best regards,<br/>{{senderName}}</p>
    `,
    textContent: `Hi {{firstName}},\n\nI've been following {{companyName}}'s growth in {{industry}} and I'm impressed with your approach to {{keyStrength}}.\n\nWe help companies like yours {{valueProposition}} which typically results in {{benefit}}.\n\nWould you be open to a 15-minute call next week to explore how we might help?\n\nBest regards,\n{{senderName}}`,
    variables: [
      "firstName",
      "companyName",
      "industry",
      "keyStrength",
      "valueProposition",
      "benefit",
      "senderName",
    ],
    category: "outreach",
    createdAt: new Date(),
  },
  FOLLOWUP_1: {
    id: "followup_1",
    name: "First Follow-up",
    subject: "Quick follow-up: {{companyName}}",
    htmlContent: `
      <h2>Hi {{firstName}},</h2>
      <p>I wanted to follow up on my previous email about {{topic}}.</p>
      <p>I believe there's a real opportunity for {{companyName}} to {{opportunity}}.</p>
      <p>Would you have 15 minutes this week for a quick call?</p>
      <p>Best regards,<br/>{{senderName}}</p>
    `,
    textContent: `Hi {{firstName}},\n\nI wanted to follow up on my previous email about {{topic}}.\n\nI believe there's a real opportunity for {{companyName}} to {{opportunity}}.\n\nWould you have 15 minutes this week for a quick call?\n\nBest regards,\n{{senderName}}`,
    variables: ["firstName", "companyName", "topic", "opportunity", "senderName"],
    category: "followup",
    createdAt: new Date(),
  },
  PROPOSAL: {
    id: "proposal",
    name: "Proposal",
    subject: "Proposal: {{companyName}} - {{proposalTitle}}",
    htmlContent: `
      <h2>Hi {{firstName}},</h2>
      <p>Following our conversation, I've prepared a proposal for {{companyName}} on {{proposalTitle}}.</p>
      <p>Key highlights:</p>
      <ul>
        <li>{{highlight1}}</li>
        <li>{{highlight2}}</li>
        <li>{{highlight3}}</li>
      </ul>
      <p>Please review and let me know if you'd like to discuss further.</p>
      <p>Best regards,<br/>{{senderName}}</p>
    `,
    textContent: `Hi {{firstName}},\n\nFollowing our conversation, I've prepared a proposal for {{companyName}} on {{proposalTitle}}.\n\nKey highlights:\n- {{highlight1}}\n- {{highlight2}}\n- {{highlight3}}\n\nPlease review and let me know if you'd like to discuss further.\n\nBest regards,\n{{senderName}}`,
    variables: [
      "firstName",
      "companyName",
      "proposalTitle",
      "highlight1",
      "highlight2",
      "highlight3",
      "senderName",
    ],
    category: "proposal",
    createdAt: new Date(),
  },
  NEWSLETTER: {
    id: "newsletter",
    name: "Newsletter",
    subject: "{{newsletterTitle}} - {{date}}",
    htmlContent: `
      <h2>{{newsletterTitle}}</h2>
      <p>{{content}}</p>
      <p>Best regards,<br/>{{senderName}}</p>
    `,
    textContent: `{{newsletterTitle}}\n\n{{content}}\n\nBest regards,\n{{senderName}}`,
    variables: ["newsletterTitle", "date", "content", "senderName"],
    category: "newsletter",
    createdAt: new Date(),
  },
};

/**
 * Send email via MailerLite
 */
export async function sendEmail(
  to: EmailRecipient,
  templateId: string,
  senderEmail: string,
  senderName: string
): Promise<EmailResult> {
  try {
    // Try to find template by ID - handle both uppercase and lowercase
    let template: EmailTemplate | undefined = EMAIL_TEMPLATES[templateId];

    // Fallback: search by id field
    if (!template) {
      template = Object.values(EMAIL_TEMPLATES).find((t) => t.id === templateId);
    }

    if (!template) {
      console.error(
        `[EMAIL] Template ${templateId} not found. Available: ${Object.keys(EMAIL_TEMPLATES).join(", ")}`
      );
      return {
        success: false,
        error: `Template ${templateId} not found`,
        timestamp: new Date(),
      };
    }

    // Replace variables in subject and content
    let subject = template.subject;
    let htmlContent = template.htmlContent;
    let textContent = template.textContent;

    for (const variable of template.variables) {
      const value = to.variables[variable] || "";
      subject = subject.replace(`{{${variable}}}`, value);
      htmlContent = htmlContent.replace(`{{${variable}}}`, value);
      textContent = textContent.replace(`{{${variable}}}`, value);
    }

    // Send via MailerLite
    const result = await sendEmailViaMailerLite({
      to: [
        {
          email: to.email,
          name: to.name,
          fields: {
            company: to.companyName || "",
          },
          tags: ["campaign", template.category],
        },
      ],
      from: {
        name: senderName,
        email: senderEmail,
      },
      subject,
      html: htmlContent,
      text: textContent,
      replyTo: senderEmail,
      tags: [template.category, "mattias"],
    });

    if (result.success) {
      console.log(`[EMAIL] ✓ Email sent successfully to ${to.email}`, {
        messageId: result.messageId,
        templateId,
        subject,
      });
    } else {
      console.error(`[EMAIL] Failed to send email to ${to.email}:`, result.error);
    }

    return result;
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date(),
    };
  }
}

/**
 * Send batch emails to multiple recipients
 */
export async function sendBatchEmails(
  recipients: EmailRecipient[],
  templateId: string,
  senderEmail: string,
  senderName: string,
  delayMs: number = 1000
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];

    try {
      const result = await sendEmail(recipient, templateId, senderEmail, senderName);
      results.push(result);

      // Add delay between sends to avoid rate limiting
      if (i < recipients.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      results.push({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date(),
      });
    }
  }

  return results;
}

/**
 * Generate email content using LLM
 */
export async function generateEmailContent(
  prompt: string,
  context: Record<string, string>
): Promise<{ subject: string; html: string; text: string }> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert email copywriter. Generate professional, engaging email content.",
        },
        {
          role: "user",
          content: `${prompt}\n\nContext: ${JSON.stringify(context)}\n\nRespond with JSON: {"subject": "...", "html": "...", "text": "..."}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "email_content",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: { type: "string", description: "Email subject line" },
              html: {
                type: "string",
                description: "HTML email content",
              },
              text: {
                type: "string",
                description: "Plain text email content",
              },
            },
            required: ["subject", "html", "text"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0].message.content;
    const content = typeof messageContent === 'string' 
      ? JSON.parse(messageContent)
      : messageContent;
    return content;
  } catch (error) {
    console.error("Error generating email content:", error);
    throw error;
  }
}
