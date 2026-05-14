import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function CampaignAnalytics() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  // Get all campaigns with metrics
  const { data: campaignsData, isLoading: campaignsLoading } =
    trpc.analytics.getAllCampaignsMetrics.useQuery({ limit: 50 });

  // Get selected campaign metrics
  const { data: metricsData, isLoading: metricsLoading } =
    trpc.analytics.getCampaignMetrics.useQuery(
      { campaignId: selectedCampaignId || "" },
      { enabled: !!selectedCampaignId }
    );

  // Get engagement timeline
  const { data: timelineData, isLoading: timelineLoading } =
    trpc.analytics.getEngagementTimeline.useQuery(
      { campaignId: selectedCampaignId || "" },
      { enabled: !!selectedCampaignId }
    );

  const campaigns = campaignsData?.campaigns || [];
  const metrics = metricsData?.metrics;
  const timeline = timelineData?.timeline || [];

  // Calculate average metrics
  const avgMetrics = useMemo(() => {
    if (campaigns.length === 0) {
      return { openRate: 0, clickRate: 0, avgSent: 0 };
    }

    const totalOpen = campaigns.reduce((sum, c) => sum + c.openRate, 0);
    const totalClick = campaigns.reduce((sum, c) => sum + c.clickRate, 0);
    const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);

    return {
      openRate: totalOpen / campaigns.length,
      clickRate: totalClick / campaigns.length,
      avgSent: Math.round(totalSent / campaigns.length),
    };
  }, [campaigns]);

  // Prepare pie chart data for top campaigns
  const topCampaigns = campaigns.slice(0, 5);
  const pieData = topCampaigns.map((c) => ({
    name: c.name,
    value: c.sentCount,
  }));

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Campaign Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Track email campaign performance and engagement metrics
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Open Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMetrics.openRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Click Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMetrics.clickRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMetrics.avgSent}</div>
            <p className="text-xs text-muted-foreground mt-1">Per campaign</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>Select a campaign to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {campaignsLoading ? (
                <div className="text-center text-muted-foreground">Loading...</div>
              ) : campaigns.length === 0 ? (
                <div className="text-center text-muted-foreground">No campaigns yet</div>
              ) : (
                campaigns.map((campaign) => (
                  <Button
                    key={campaign.id}
                    variant={selectedCampaignId === campaign.id ? "default" : "outline"}
                    className="w-full justify-start text-left"
                    onClick={() => setSelectedCampaignId(campaign.id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{campaign.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {campaign.sentCount} sent • {campaign.openRate.toFixed(1)}% open
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Campaigns by Volume */}
          <Card>
            <CardHeader>
              <CardTitle>Top Campaigns by Volume</CardTitle>
              <CardDescription>Email sent distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8">No data available</div>
              )}
            </CardContent>
          </Card>

          {/* Campaign Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance</CardTitle>
              <CardDescription>Open and click rates comparison</CardDescription>
            </CardHeader>
            <CardContent>
              {campaigns.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={campaigns.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="openRate" fill="#3b82f6" name="Open Rate %" />
                    <Bar dataKey="clickRate" fill="#10b981" name="Click Rate %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground py-8">No data available</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Campaign Details */}
      {selectedCampaignId && metrics && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{metrics.campaignName}</CardTitle>
              <CardDescription>Detailed metrics and performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                  <div className="text-2xl font-bold">{metrics.sentCount}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Opened</div>
                  <div className="text-2xl font-bold">{metrics.openCount}</div>
                  <div className="text-xs text-muted-foreground">{metrics.openRate}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Clicked</div>
                  <div className="text-2xl font-bold">{metrics.clickCount}</div>
                  <div className="text-xs text-muted-foreground">{metrics.clickRate}%</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Bounced</div>
                  <div className="text-2xl font-bold">{metrics.bounceCount}</div>
                  <div className="text-xs text-muted-foreground">{metrics.bounceRate}%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Timeline */}
          {timeline.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Engagement Timeline</CardTitle>
                <CardDescription>Opens and clicks over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="opens" stroke="#3b82f6" name="Opens" />
                    <Line type="monotone" dataKey="clicks" stroke="#10b981" name="Clicks" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
