import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  Target,
  Clock,
  Plus,
  Edit,
  Pause,
  Play,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

interface Campaign {
  id: string;
  name: string;
  platform: "google_ads" | "meta_ads" | "tiktok_ads" | "youtube";
  status: "active" | "paused" | "completed" | "scheduled";
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  roas: number; // Return on ad spend
  startDate: Date;
  endDate: Date;
  createdAt: Date;
}

const mockCampaigns: Campaign[] = [
  {
    id: "camp-1",
    name: "Summer Product Launch",
    platform: "google_ads",
    status: "active",
    budget: 5000,
    spent: 3250,
    impressions: 125000,
    clicks: 3750,
    conversions: 450,
    ctr: 3.0,
    cpc: 0.87,
    roas: 4.2,
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  },
  {
    id: "camp-2",
    name: "Retargeting Campaign",
    platform: "meta_ads",
    status: "active",
    budget: 3000,
    spent: 2100,
    impressions: 85000,
    clicks: 2550,
    conversions: 280,
    ctr: 3.0,
    cpc: 0.82,
    roas: 3.8,
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
  },
  {
    id: "camp-3",
    name: "TikTok Brand Awareness",
    platform: "tiktok_ads",
    status: "paused",
    budget: 2000,
    spent: 1200,
    impressions: 450000,
    clicks: 5400,
    conversions: 120,
    ctr: 1.2,
    cpc: 0.22,
    roas: 2.1,
    startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  },
  {
    id: "camp-4",
    name: "YouTube Video Ads",
    platform: "youtube",
    status: "scheduled",
    budget: 4000,
    spent: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    ctr: 0,
    cpc: 0,
    roas: 0,
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
];

function getPlatformColor(platform: string): string {
  switch (platform) {
    case "google_ads":
      return "oklch(0.72 0.18 200)";
    case "meta_ads":
      return "oklch(0.65 0.22 270)";
    case "tiktok_ads":
      return "oklch(0.75 0.18 75)";
    case "youtube":
      return "oklch(0.6 0.22 25)";
    default:
      return "oklch(0.5 0.02 260)";
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-900 text-green-100">Active</Badge>;
    case "paused":
      return <Badge className="bg-yellow-900 text-yellow-100">Paused</Badge>;
    case "completed":
      return <Badge className="bg-gray-700 text-gray-100">Completed</Badge>;
    case "scheduled":
      return <Badge className="bg-blue-900 text-blue-100">Scheduled</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const budgetPercentage = (campaign.spent / campaign.budget) * 100;
  const daysRemaining = Math.ceil(
    (campaign.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card className="hover:border-blue-500/50 transition-colors">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{campaign.name}</h3>
                {getStatusBadge(campaign.status)}
              </div>
              <p className="text-xs" style={{ color: "oklch(0.5 0.02 260)" }}>
                {campaign.platform.replace("_", " ").toUpperCase()}
              </p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Edit className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {campaign.status === "active" ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Budget Progress */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Budget</span>
              <span className="text-sm" style={{ color: "oklch(0.5 0.02 260)" }}>
                ${campaign.spent.toLocaleString()} / ${campaign.budget.toLocaleString()}
              </span>
            </div>
            <Progress value={Math.min(budgetPercentage, 100)} className="h-2" />
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Impressions */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Impressions</p>
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-sm">
                  {(campaign.impressions / 1000).toFixed(0)}K
                </span>
              </div>
            </div>

            {/* Clicks */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Clicks</p>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-cyan-500" />
                <span className="font-semibold text-sm">
                  {campaign.clicks.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Conversions */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Conversions</p>
              <div className="flex items-center gap-1">
                <Target className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-sm">
                  {campaign.conversions.toLocaleString()}
                </span>
              </div>
            </div>

            {/* ROAS */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">ROAS</p>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="font-semibold text-sm">{campaign.roas.toFixed(1)}x</span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t" style={{ borderColor: "oklch(0.22 0.02 260)" }}>
            <div>
              <p className="text-xs text-muted-foreground">CTR</p>
              <span className="font-semibold text-sm">{campaign.ctr.toFixed(2)}%</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">CPC</p>
              <span className="font-semibold text-sm">${campaign.cpc.toFixed(2)}</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Days Left</p>
              <span className="font-semibold text-sm">{daysRemaining}</span>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-2 text-xs" style={{ color: "oklch(0.5 0.02 260)" }}>
            <Clock className="w-4 h-4" />
            <span>{format(campaign.startDate, "MMM d")} - {format(campaign.endDate, "MMM d")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MarketingCampaigns() {
  const activeCampaigns = mockCampaigns.filter((c) => c.status === "active").length;
  const totalBudget = mockCampaigns.reduce((sum, c) => sum + c.budget, 0);
  const totalSpent = mockCampaigns.reduce((sum, c) => sum + c.spent, 0);
  const totalConversions = mockCampaigns.reduce((sum, c) => sum + c.conversions, 0);
  const avgROAS = (
    mockCampaigns.reduce((sum, c) => sum + c.roas, 0) / mockCampaigns.length
  ).toFixed(2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage and optimize your ad campaigns</p>
        </div>
        <Button className="gap-2" style={{ background: "oklch(0.65 0.22 270)" }}>
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground mt-1">of {mockCampaigns.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${totalSpent.toLocaleString()} spent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalConversions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total across all campaigns</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgROAS}x</div>
            <p className="text-xs text-muted-foreground mt-1">Return on ad spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {mockCampaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </div>
  );
}
