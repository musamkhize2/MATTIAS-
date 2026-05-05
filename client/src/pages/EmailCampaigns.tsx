import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Eye, Settings } from "lucide-react";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: "outreach" | "followup" | "proposal" | "newsletter" | "alert";
  variables: string[];
}

interface Campaign {
  id: string;
  name: string;
  templateId: string;
  status: "draft" | "scheduled" | "sending" | "sent";
  recipientCount: number;
  sentCount: number;
  openRate: number;
  createdAt: Date;
}

const TEMPLATES: EmailTemplate[] = [
  {
    id: "cold_outreach",
    name: "Cold Outreach",
    subject: "{{companyName}} - Partnership Opportunity",
    category: "outreach",
    variables: [
      "firstName",
      "companyName",
      "industry",
      "keyStrength",
      "valueProposition",
      "benefit",
    ],
  },
  {
    id: "followup_1",
    name: "First Follow-up",
    subject: "Quick follow-up: {{companyName}}",
    category: "followup",
    variables: ["firstName", "companyName", "solution", "videoLink"],
  },
  {
    id: "proposal",
    name: "Proposal Email",
    subject: "Proposal: {{projectName}} for {{companyName}}",
    category: "proposal",
    variables: ["firstName", "projectName", "companyName", "projectScope", "timeline", "investment"],
  },
  {
    id: "newsletter",
    name: "Weekly Newsletter",
    subject: "Weekly Insights: {{topic}}",
    category: "newsletter",
    variables: ["firstName", "topic", "content", "actionItem"],
  },
];

const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "camp_001",
    name: "Tech Startup Outreach - Q2 2026",
    templateId: "cold_outreach",
    status: "sent",
    recipientCount: 250,
    sentCount: 248,
    openRate: 34.2,
    createdAt: new Date("2026-05-01"),
  },
  {
    id: "camp_002",
    name: "SaaS Follow-up Campaign",
    templateId: "followup_1",
    status: "sending",
    recipientCount: 150,
    sentCount: 89,
    openRate: 28.5,
    createdAt: new Date("2026-05-03"),
  },
  {
    id: "camp_003",
    name: "Enterprise Proposals",
    templateId: "proposal",
    status: "draft",
    recipientCount: 45,
    sentCount: 0,
    openRate: 0,
    createdAt: new Date("2026-05-05"),
  },
];

export default function EmailCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("cold_outreach");
  const [campaignName, setCampaignName] = useState<string>("");
  const [recipientCount, setRecipientCount] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("campaigns");

  const selectedTemplateData = TEMPLATES.find((t) => t.id === selectedTemplate);

  const handleCreateCampaign = () => {
    if (!campaignName || !recipientCount) {
      alert("Please fill in all fields");
      return;
    }

    const newCampaign: Campaign = {
      id: `camp_${Date.now()}`,
      name: campaignName,
      templateId: selectedTemplate,
      status: "draft",
      recipientCount: parseInt(recipientCount),
      sentCount: 0,
      openRate: 0,
      createdAt: new Date(),
    };

    setCampaigns([...campaigns, newCampaign]);
    setCampaignName("");
    setRecipientCount("");
    alert("Campaign created successfully!");
  };

  const handleSendCampaign = (campaignId: string) => {
    setCampaigns(
      campaigns.map((c) =>
        c.id === campaignId ? { ...c, status: "sending" as const } : c
      )
    );
    alert("Campaign sending started!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "sending":
        return "bg-blue-100 text-blue-800";
      case "scheduled":
        return "bg-yellow-100 text-yellow-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Campaigns</h1>
          <p className="text-gray-500 mt-1">Create and manage email campaigns with templates</p>
        </div>
        <Mail className="w-12 h-12 text-blue-600" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="campaigns">My Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4">
            {campaigns.map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{campaign.name}</CardTitle>
                      <CardDescription>
                        Template: {TEMPLATES.find((t) => t.id === campaign.templateId)?.name}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Recipients</p>
                      <p className="text-2xl font-bold">{campaign.recipientCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Sent</p>
                      <p className="text-2xl font-bold">{campaign.sentCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Open Rate</p>
                      <p className="text-2xl font-bold">{campaign.openRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Created</p>
                      <p className="text-sm font-semibold">
                        {campaign.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    {campaign.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => handleSendCampaign(campaign.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Campaign
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {TEMPLATES.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.subject}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Variables:</p>
                    <div className="flex flex-wrap gap-2">
                      {template.variables.map((v) => (
                        <Badge key={v} variant="secondary">
                          {v}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Category: <span className="font-semibold">{template.category}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Campaign</CardTitle>
              <CardDescription>Set up a new email campaign from a template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g., Q2 Tech Startup Outreach"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="template-select">Select Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recipient-count">Number of Recipients</Label>
                <Input
                  id="recipient-count"
                  type="number"
                  placeholder="e.g., 250"
                  value={recipientCount}
                  onChange={(e) => setRecipientCount(e.target.value)}
                />
              </div>

              {selectedTemplateData && (
                <div>
                  <Label>Template Variables</Label>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <p className="text-sm font-semibold">This template uses:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplateData.variables.map((v) => (
                        <Badge key={v} variant="secondary">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={handleCreateCampaign}
                  className="bg-blue-600 hover:bg-blue-700 flex-1"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  {showPreview ? "Hide Preview" : "Preview Template"}
                </Button>
              </div>

              {showPreview && selectedTemplateData && (
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-base">Template Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500">Subject:</p>
                      <p className="font-semibold">{selectedTemplateData.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Category:</p>
                      <Badge>{selectedTemplateData.category}</Badge>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Campaign Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Campaigns</p>
              <p className="text-3xl font-bold">{campaigns.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Recipients</p>
              <p className="text-3xl font-bold">
                {campaigns.reduce((sum, c) => sum + c.recipientCount, 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Total Sent</p>
              <p className="text-3xl font-bold">
                {campaigns.reduce((sum, c) => sum + c.sentCount, 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500">Avg Open Rate</p>
              <p className="text-3xl font-bold">
                {(
                  campaigns.reduce((sum, c) => sum + c.openRate, 0) / campaigns.length
                ).toFixed(1)}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
