import { getDb } from "../db";
import { emailCampaigns, actionHistory } from "../../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { notifyAnalyticsReport } from "./notificationService";
import { sendTransactionalEmail } from "./mailerliteTransactional";

export interface AnalyticsReportData {
  period: string;
  campaignCount: number;
  totalEmails: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  topCampaigns: Array<{
    name: string;
    sent: number;
    opens: number;
    clicks: number;
  }>;
}

/**
 * Generate analytics report for a tenant
 */
export async function generateAnalyticsReport(
  tenantId: number,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsReportData> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get campaigns in the period
  const campaigns = await db
    .select()
    .from(emailCampaigns)
    .where(
      and(
        eq(emailCampaigns.tenantId, tenantId),
        gte(emailCampaigns.createdAt, startDate),
        lte(emailCampaigns.createdAt, endDate)
      )
    );

  // Calculate metrics
  const campaignCount = campaigns.length;
  const totalEmails = campaigns.reduce((sum, c) => sum + (c.recipientCount || 0), 0);
  const sentCount = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
  const openCount = campaigns.reduce((sum, c) => sum + (c.openCount || 0), 0);
  const clickCount = campaigns.reduce((sum, c) => sum + (c.clickCount || 0), 0);
  const bounceCount = campaigns.reduce((sum, c) => sum + ((c as any).bounceCount || 0), 0);

  const openRate = sentCount > 0 ? (openCount / sentCount) * 100 : 0;
  const clickRate = sentCount > 0 ? (clickCount / sentCount) * 100 : 0;
  const bounceRate = sentCount > 0 ? (bounceCount / sentCount) * 100 : 0;

  // Get top campaigns
  const topCampaigns = campaigns
    .sort((a, b) => (b.openCount || 0) - (a.openCount || 0))
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      sent: c.sentCount || 0,
      opens: c.openCount || 0,
      clicks: c.clickCount || 0,
    }));

  const periodLabel = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;

  return {
    period: periodLabel,
    campaignCount,
    totalEmails,
    sentCount,
    openCount,
    clickCount,
    bounceCount,
    openRate,
    clickRate,
    bounceRate,
    topCampaigns,
  };
}

/**
 * Generate and send analytics report email
 */
export async function generateAndSendAnalyticsReport(
  tenantId: number,
  recipientEmail: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> {
  try {
    const report = await generateAnalyticsReport(tenantId, startDate, endDate);
    const htmlContent = formatAnalyticsReportHtml(report);

    const result = await sendTransactionalEmail({
      to: recipientEmail,
      subject: `MATTIAS Analytics Report: ${report.period}`,
      html: htmlContent,
    });

    if (result.success) {
      // Send notification
      await notifyAnalyticsReport(
        tenantId,
        report.period,
        report.campaignCount,
        report.totalEmails,
        report.openRate,
        report.clickRate
      );

      console.log(`[Analytics] Report sent to ${recipientEmail}`);
      return true;
    } else {
      console.error(`[Analytics] Failed to send report to ${recipientEmail}`);
      return false;
    }
  } catch (error) {
    console.error("[Analytics] Error generating report:", error);
    return false;
  }
}

/**
 * Format analytics report as HTML email
 */
function formatAnalyticsReportHtml(report: AnalyticsReportData): string {
  const topCampaignsHtml = report.topCampaigns
    .map(
      (c) => `
    <tr>
      <td>${c.name}</td>
      <td>${c.sent}</td>
      <td>${c.opens}</td>
      <td>${c.clicks}</td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; }
          .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px; }
          .metric-card { background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
          .metric-value { font-size: 32px; font-weight: bold; color: #667eea; }
          .metric-label { font-size: 14px; color: #666; margin-top: 5px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 15px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; }
          th { background-color: #667eea; color: white; padding: 12px; text-align: left; }
          td { padding: 12px; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 MATTIAS Analytics Report</h1>
            <p>Period: ${report.period}</p>
          </div>

          <div class="metrics">
            <div class="metric-card">
              <div class="metric-value">${report.campaignCount}</div>
              <div class="metric-label">Campaigns</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${report.totalEmails.toLocaleString()}</div>
              <div class="metric-label">Total Emails</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${report.openRate.toFixed(1)}%</div>
              <div class="metric-label">Open Rate</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📈 Key Metrics</div>
            <table>
              <tr>
                <th>Metric</th>
                <th>Value</th>
              </tr>
              <tr>
                <td>Emails Sent</td>
                <td>${report.sentCount.toLocaleString()}</td>
              </tr>
              <tr>
                <td>Opens</td>
                <td>${report.openCount.toLocaleString()} (${report.openRate.toFixed(2)}%)</td>
              </tr>
              <tr>
                <td>Clicks</td>
                <td>${report.clickCount.toLocaleString()} (${report.clickRate.toFixed(2)}%)</td>
              </tr>
              <tr>
                <td>Bounces</td>
                <td>${report.bounceCount.toLocaleString()} (${report.bounceRate.toFixed(2)}%)</td>
              </tr>
            </table>
          </div>

          ${
            report.topCampaigns.length > 0
              ? `
          <div class="section">
            <div class="section-title">🏆 Top Performing Campaigns</div>
            <table>
              <tr>
                <th>Campaign</th>
                <th>Sent</th>
                <th>Opens</th>
                <th>Clicks</th>
              </tr>
              ${topCampaignsHtml}
            </table>
          </div>
          `
              : ""
          }

          <div class="footer">
            <p>This is an automated report from MATTIAS AI Operating System</p>
            <p>© 2026 MATTIAS. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Schedule weekly analytics report (to be called by scheduler)
 */
export async function scheduleWeeklyAnalyticsReport(
  tenantId: number,
  recipientEmail: string
): Promise<boolean> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago

  return generateAndSendAnalyticsReport(tenantId, recipientEmail, startDate, endDate);
}

/**
 * Schedule monthly analytics report (to be called by scheduler)
 */
export async function scheduleMonthlyAnalyticsReport(
  tenantId: number,
  recipientEmail: string
): Promise<boolean> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  return generateAndSendAnalyticsReport(tenantId, recipientEmail, startDate, endDate);
}
