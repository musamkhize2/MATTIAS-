import LogoHeader from "@/components/LogoHeader";
"use client";

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
import { Mail, Send, Eye, Settings, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

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
    subject: "Quick follow-up: {{companyName}} Demo",
    category: "followup",
    variables: ["firstName", "companyName", "demoLink", "timeSlot"],
  },
  {
    id: "proposal",
    name: "Partnership Proposal",
    subject: "Partnership Proposal for {{companyName}}",
    category: "proposal",
    variables: ["firstName", "companyName", "proposalLink", "deadline"],
  },
  {
    id: "newsletter",
    name: "Weekly Newsletter",
    subject: "Weekly Tech Digest - {{weekNumber}}",
    category: "newsletter",
    variables: ["firstName", "weekNumber", "topicCount"],
  },
];

const DEMO_CAMPAIGNS: Campaign[] = [
  {
    id: "camp_001",
    name: "Q2 2026 Enterprise Outreach",
    templateId: "cold_outreach",
    status: "sent",
    recipientCount: 150,
    sentCount: 150,
    openRate: 0.32,
    createdAt: new Date("2026-04-15"),
  },
  {
    id: "camp_002",
    name: "Follow-up: Product Demo",
    templateId: "followup_1",
    status: "sending",
    recipientCount: 45,
    sentCount: 32,
    openRate: 0.28,
    createdAt: new Date("2026-05-05"),
  },
];

export default function EmailCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("cold_outreach");
  const [campaignName, setCampaignName] = useState<string>("");
  const [recipientEmails, setRecipientEmails] = useState<string>("");
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("campaigns");
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // tRPC mutations for real backend execution
  const sendEmailCampaignMutation = trpc.actions.sendEmailCampaign.useMutation({
    onSuccess: (result) => {
      // Add new campaign to list
      const newCampaign: Campaign = {
        id: result.actionId,
        name: campaignName,
        templateId: selectedTemplate,
        status: "draft",
        recipientCount: recipientEmails.split(",").length,
        sentCount: 0,
        openRate: 0,
        createdAt: new Date(),
      };
      setCampaigns([...campaigns, newCampaign]);
      setCampaignName("");
      setRecipientEmails("");
      alert("✓ Campaign created successfully!");
    },
    onError: (error) => {
      alert(`✗ Error creating campaign: ${error.message}`);
    },
  });

  const executeActionMutation = trpc.actions.executeAction.useMutation({
    onSuccess: (result) => {
      // Update campaign status - result.action.id contains the action ID
      const actionId = result.action?.id || "";
      setCampaigns(
        campaigns.map((c) =>
          c.id === actionId ? { ...c, status: "sending" as const } : c
        )
      );
      alert("✓ Campaign sending started!");
    },
    onError: (error) => {
      alert(`✗ Error sending campaign: ${error.message}`);
    },
  });

  const selectedTemplateData = TEMPLATES.find((t) => t.id === selectedTemplate);

  const handleCreateCampaign = async () => {
    if (!campaignName || !recipientEmails) {
      alert("⚠ Please fill in campaign name and recipient emails");
      return;
    }

    // Call real backend tRPC mutation
    await sendEmailCampaignMutation.mutateAsync({
      recipients: recipientEmails.split(",").map((email) => ({
        email: email.trim(),
        name: email.trim().split("@")[0],
      })),
      templateId: selectedTemplate,
      senderEmail: "campaigns@company.com",
      senderName: "Campaign Manager",
    });
  };

  const handleSendCampaign = async (campaignId: string) => {
    // Call real backend tRPC mutation
    // Use string literal that matches ActionType.SEND_EMAIL value
    await executeActionMutation.mutateAsync({
      type: "send_email",
      priority: "high",
      payload: {
        campaignId: campaignId,
        templateId: selectedTemplate,
      },
    } as any);
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

  const isLoading = sendEmailCampaignMutation.isPending || executeActionMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Campaigns</h1>
          <p className="text-gray-600 mt-2">Create and manage email campaigns with real-time tracking</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      {settingsOpen && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Campaign Settings</CardTitle>
            <CardDescription>Configure your email campaign preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Default Sender Email</Label>
              <Input placeholder="campaigns@company.com" defaultValue="campaigns@company.com" />
            </div>
            <div>
              <Label>Unsubscribe Link</Label>
              <Input placeholder="https://company.com/unsubscribe" defaultValue="https://company.com/unsubscribe" />
            </div>
            <div>
              <Label>Reply-To Email</Label>
              <Input placeholder="support@company.com" defaultValue="support@company.com" />
            </div>
            <Button onClick={() => setSettingsOpen(false)}>Save Settings</Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns">Active Campaigns</TabsTrigger>
          <TabsTrigger value="create">Create Campaign</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid gap-4">
            {campaigns.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">No campaigns yet. Create one to get started!</p>
                </CardContent>
              </Card>
            ) : (
              campaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-blue-600" />
                        <div>
                          <CardTitle>{campaign.name}</CardTitle>
                          <CardDescription>
                            Created {campaign.createdAt.toLocaleDateString()}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge className={getStatusColor(campaign.status)}>
                        {campaign.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Recipients</p>
                        <p className="text-2xl font-bold">{campaign.recipientCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Sent</p>
                        <p className="text-2xl font-bold">{campaign.sentCount}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Open Rate</p>
                        <p className="text-2xl font-bold">{(campaign.openRate * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSendCampaign(campaign.id)}
                        disabled={campaign.status === "sent" || isLoading}
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Send Campaign
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="icon">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New Campaign</CardTitle>
              <CardDescription>Set up a new email campaign with real backend execution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="Q2 2026 Enterprise Outreach"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="template">Email Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger id="template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="recipients">Recipient Emails (comma-separated)</Label>
                <Textarea
                  id="recipients"
                  placeholder="john@example.com, jane@example.com, bob@example.com"
                  value={recipientEmails}
                  onChange={(e) => setRecipientEmails(e.target.value)}
                  rows={4}
                />
              </div>

              {selectedTemplateData && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Template Preview</p>
                  <p className="text-sm text-gray-600">
                    <strong>Subject:</strong> {selectedTemplateData.subject}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>Variables:</strong> {selectedTemplateData.variables.join(", ")}
                  </p>
                </div>
              )}

              <Button
                onClick={handleCreateCampaign}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Campaign...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create Campaign
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
