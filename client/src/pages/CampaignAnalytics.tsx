import LogoHeader from "@/components/LogoHeader";
import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";

export default function CampaignAnalytics() {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [isExporting, setIsExporting] = useState(false);

  // Get all campaigns with metrics
  const { data: campaignsData, isLoading: campaignsLoading, refetch: refetchCampaigns } =
    trpc.analytics.getAllCampaignsMetrics.useQuery({ limit: 50 });

  // Get selected campaign metrics
  const { data: metricsData, isLoading: metricsLoading, refetch: refetchMetrics } =
    trpc.analytics.getCampaignMetrics.useQuery(
      { campaignId: selectedCampaignId || "" },
      { enabled: !!selectedCampaignId }
    );

  // Get engagement timeline
  const { data: timelineData, isLoading: timelineLoading, refetch: refetchTimeline } =
    trpc.analytics.getEngagementTimeline.useQuery(
      { campaignId: selectedCampaignId || "" },
      { enabled: !!selectedCampaignId }
    );

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refetchCampaigns();
      if (selectedCampaignId) {
        refetchMetrics();
        refetchTimeline();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, selectedCampaignId, refetchCampaigns, refetchMetrics, refetchTimeline]);

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

  // Export functions
  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const headers = ["Campaign Name", "Sent", "Open Rate", "Click Rate"];
      const rows = campaigns.map((c) => [
        c.name,
        c.sentCount,
        c.openRate.toFixed(2) + "%",
        c.clickRate.toFixed(2) + "%",
      ]);

      const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign-analytics-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      const data = {
        exportDate: new Date().toISOString(),
        summary: avgMetrics,
        campaigns,
        timeline,
      };

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign-analytics-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const handleManualRefresh = () => {
    refetchCampaigns();
    if (selectedCampaignId) {
      refetchMetrics();
      refetchTimeline();
    }
  };

  return (
    <div className="space-y-8">
      {/* Header with Controls */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaign Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Track email campaign performance and engagement metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={campaignsLoading}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={!campaigns.length || isExporting}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToJSON}
            disabled={!campaigns.length || isExporting}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            JSON
          </Button>
        </div>
      </div>

      {/* Auto-Refresh Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Auto-Refresh Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">Enable auto-refresh</span>
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
            className="text-sm px-2 py-1 border rounded"
          >
            <option value={10000}>Every 10 seconds</option>
            <option value={30000}>Every 30 seconds</option>
            <option value={60000}>Every 1 minute</option>
            <option value={300000}>Every 5 minutes</option>
          </select>
          {autoRefresh && (
            <span className="text-xs text-muted-foreground ml-auto">
              Auto-refresh enabled
            </span>
          )}
        </CardContent>
      </Card>

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

      {/* Campaign Distribution */}
      {pieData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Campaigns by Volume</CardTitle>
            <CardDescription>Email distribution across top 5 campaigns</CardDescription>
          </CardHeader>
          <CardContent>
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
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Campaign List and Details */}
      {campaigns.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Campaign List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>{campaigns.length} total campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {campaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      selectedCampaignId === campaign.id
                        ? "bg-blue-50 border-blue-300"
                        : "hover:bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="font-medium text-sm truncate">{campaign.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {campaign.sentCount} sent
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Campaign Details */}
          {selectedCampaignId && metrics && (
            <div className="lg:col-span-2 space-y-4">
              {/* Metrics Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Open Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.openRate.toFixed(1)}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Click Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.clickRate.toFixed(1)}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Bounce Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.bounceRate.toFixed(1)}%</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.sentCount}</div>
                  </CardContent>
                </Card>
              </div>

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
      )}

      {/* Empty State */}
      {campaigns.length === 0 && !campaignsLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground">No campaigns found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Create your first email campaign to see analytics
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
