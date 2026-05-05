import { getDb } from "../db";
import { invokeLLM } from "../_core/llm";

/**
 * Email service integration with SendGrid
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
      <p>I wanted to follow up on my previous message about helping {{companyName}} with {{solution}}.</p>
      <p>I know you're busy, but I think this could be valuable for your team. Here's a quick video showing how it works: {{videoLink}}</p>
      <p>Let me know if you'd like to chat!</p>
      <p>{{senderName}}</p>
    `,
    textContent: `Hi {{firstName}},\n\nI wanted to follow up on my previous message about helping {{companyName}} with {{solution}}.\n\nI know you're busy, but I think this could be valuable for your team. Here's a quick video: {{videoLink}}\n\nLet me know if you'd like to chat!\n\n{{senderName}}`,
    variables: ["firstName", "companyName", "solution", "videoLink", "senderName"],
    category: "followup",
    createdAt: new Date(),
  },
  PROPOSAL: {
    id: "proposal",
    name: "Proposal Email",
    subject: "Proposal: {{projectName}} for {{companyName}}",
    htmlContent: `
      <h2>Hi {{firstName}},</h2>
      <p>Thank you for the great conversation about {{projectName}}. As discussed, here's our proposal:</p>
      <h3>Project Scope:</h3>
      <p>{{projectScope}}</p>
      <h3>Timeline:</h3>
      <p>{{timeline}}</p>
      <h3>Investment:</h3>
      <p>{{investment}}</p>
      <p>We're excited to work with {{companyName}} on this. Please review and let me know if you have any questions.</p>
      <p>{{senderName}}</p>
    `,
    textContent: `Hi {{firstName}},\n\nThank you for the great conversation about {{projectName}}. As discussed, here's our proposal:\n\nProject Scope:\n{{projectScope}}\n\nTimeline:\n{{timeline}}\n\nInvestment:\n{{investment}}\n\nWe're excited to work with {{companyName}} on this. Please review and let me know if you have any questions.\n\n{{senderName}}`,
    variables: [
      "firstName",
      "projectName",
      "companyName",
      "projectScope",
      "timeline",
      "investment",
      "senderName",
    ],
    category: "proposal",
    createdAt: new Date(),
  },
  NEWSLETTER: {
    id: "newsletter",
    name: "Weekly Newsletter",
    subject: "Weekly Insights: {{topic}}",
    htmlContent: `
      <h2>Hi {{firstName}},</h2>
      <h3>This Week's Insights</h3>
      <p>{{content}}</p>
      <h3>Action Item:</h3>
      <p>{{actionItem}}</p>
      <p>Questions? Reply to this email!</p>
      <p>{{senderName}}</p>
    `,
    textContent: `Hi {{firstName}},\n\nThis Week's Insights\n{{content}}\n\nAction Item:\n{{actionItem}}\n\nQuestions? Reply to this email!\n\n{{senderName}}`,
    variables: ["firstName", "topic", "content", "actionItem", "senderName"],
    category: "newsletter",
    createdAt: new Date(),
  },
};

/**
 * Send email via SendGrid
 */
export async function sendEmail(
  to: EmailRecipient,
  templateId: string,
  senderEmail: string,
  senderName: string
): Promise<EmailResult> {
  try {
    const template = EMAIL_TEMPLATES[templateId];
    if (!template) {
      return {
        success: false,
        error: `Template ${templateId} not found`,
        timestamp: new Date(),
      };
    }

    // Replace variables in subject and content
    let subject = template.subject;
    let htmlContent = template.htmlContent;

    for (const variable of template.variables) {
      const value = to.variables[variable] || "";
      subject = subject.replace(`{{${variable}}}`, value);
      htmlContent = htmlContent.replace(`{{${variable}}}`, value);
    }

    // In production, this would call SendGrid API
    // For now, we'll simulate the send and log it
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[EMAIL] Sending to ${to.email}`, {
      from: senderEmail,
      to: to.email,
      subject,
      templateId,
      messageId,
    });

    // TODO: Integrate with SendGrid API
    // const sgMail = require("@sendgrid/mail");
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: to.email,
    //   from: senderEmail,
    //   subject,
    //   html: htmlContent,
    //   text: template.textContent,
    //   replyTo: senderEmail,
    // });

    return {
      success: true,
      messageId,
      timestamp: new Date(),
    };
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
    const result = await sendEmail(recipients[i], templateId, senderEmail, senderName);
    results.push(result);

    // Add delay between sends to avoid rate limiting
    if (i < recipients.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

/**
 * Generate personalized email content using LLM
 */
export async function generatePersonalizedEmail(
  companyName: string,
  industry: string,
  recipientName: string,
  context: string
): Promise<{ subject: string; body: string }> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are an expert at writing personalized, professional business emails that get responses. Write compelling, concise emails that focus on value.",
        },
        {
          role: "user",
          content: `Write a personalized outreach email for:
- Company: ${companyName}
- Industry: ${industry}
- Recipient: ${recipientName}
- Context: ${context}

Respond with JSON: { "subject": "...", "body": "..." }`,
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
              body: { type: "string", description: "Email body content" },
            },
            required: ["subject", "body"],
            additionalProperties: false,
          },
        },
      },
    });

    const messageContent = response.choices[0]?.message?.content;
    if (!messageContent) {
      throw new Error("No content in LLM response");
    }

    const content = typeof messageContent === "string" ? messageContent : JSON.stringify(messageContent);
    const parsed = JSON.parse(content);
    return {
      subject: parsed.subject,
      body: parsed.body,
    };
  } catch (error) {
    console.error("Error generating personalized email:", error);
    throw error;
  }
}

/**
 * Get email template by ID
 */
export function getEmailTemplate(templateId: string): EmailTemplate | null {
  return EMAIL_TEMPLATES[templateId] || null;
}

/**
 * Get all available templates
 */
export function getAllEmailTemplates(): EmailTemplate[] {
  return Object.values(EMAIL_TEMPLATES);
}

/**
 * Create custom email template
 */
export function createCustomTemplate(
  name: string,
  subject: string,
  htmlContent: string,
  textContent: string,
  category: EmailTemplate["category"]
): EmailTemplate {
  const variables = extractVariables(htmlContent);

  return {
    id: `custom_${Date.now()}`,
    name,
    subject,
    htmlContent,
    textContent,
    variables,
    category,
    createdAt: new Date(),
  };
}

/**
 * Extract template variables from content
 */
function extractVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Validate email recipient data
 */
export function validateRecipient(recipient: EmailRecipient, templateId: string): boolean {
  const template = EMAIL_TEMPLATES[templateId];
  if (!template) return false;

  // Check if all required variables are provided
  for (const variable of template.variables) {
    if (!recipient.variables[variable]) {
      console.warn(`Missing variable: ${variable} for recipient ${recipient.email}`);
      return false;
    }
  }

  return true;
}

/**
 * Format email statistics
 */
export function formatEmailStats(campaign: EmailCampaign): string {
  const deliveryRate = ((campaign.sentCount / campaign.recipientCount) * 100).toFixed(1);
  return `
Campaign: ${campaign.name}
Status: ${campaign.status}
Recipients: ${campaign.recipientCount}
Sent: ${campaign.sentCount} (${deliveryRate}%)
Open Rate: ${campaign.openRate.toFixed(1)}%
Click Rate: ${campaign.clickRate.toFixed(1)}%
  `.trim();
}
