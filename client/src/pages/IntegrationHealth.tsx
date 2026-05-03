import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

interface IntegrationStatus {
  id: string;
  name: string;
  type: "crm" | "ad_platform" | "email" | "webhook";
  status: "healthy" | "degraded" | "down" | "warning";
  lastCheck: Date;
  uptime: number; // percentage
  requestsPerHour: number;
  errorRate: number; // percentage
  avgResponseTime: number; // milliseconds
  nextCheck?: Date;
}

const mockIntegrations: IntegrationStatus[] = [
  {
    id: "hubspot-1",
    name: "HubSpot CRM",
    type: "crm",
    status: "healthy",
    lastCheck: new Date(Date.now() - 2 * 60 * 1000),
    uptime: 99.98,
    requestsPerHour: 1250,
    errorRate: 0.02,
    avgResponseTime: 145,
    nextCheck: new Date(Date.now() + 5 * 60 * 1000),
  },
  {
    id: "google-ads-1",
    name: "Google Ads API",
    type: "ad_platform",
    status: "healthy",
    lastCheck: new Date(Date.now() - 1 * 60 * 1000),
    uptime: 99.95,
    requestsPerHour: 890,
    errorRate: 0.05,
    avgResponseTime: 267,
    nextCheck: new Date(Date.now() + 4 * 60 * 1000),
  },
  {
    id: "salesforce-1",
    name: "Salesforce",
    type: "crm",
    status: "warning",
    lastCheck: new Date(Date.now() - 8 * 60 * 1000),
    uptime: 99.5,
    requestsPerHour: 450,
    errorRate: 0.5,
    avgResponseTime: 512,
    nextCheck: new Date(Date.now() + 2 * 60 * 1000),
  },
  {
    id: "meta-ads-1",
    name: "Meta Ads Manager",
    type: "ad_platform",
    status: "degraded",
    lastCheck: new Date(Date.now() - 3 * 60 * 1000),
    uptime: 98.5,
    requestsPerHour: 320,
    errorRate: 1.5,
    avgResponseTime: 890,
    nextCheck: new Date(Date.now() + 2 * 60 * 1000),
  },
  {
    id: "webhook-1",
    name: "Webhook Receiver",
    type: "webhook",
    status: "healthy",
    lastCheck: new Date(Date.now() - 30 * 1000),
    uptime: 99.99,
    requestsPerHour: 2100,
    errorRate: 0.01,
    avgResponseTime: 89,
    nextCheck: new Date(Date.now() + 30 * 1000),
  },
];

function getStatusIcon(status: string) {
  switch (status) {
    case "healthy":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case "degraded":
      return <AlertCircle className="w-5 h-5 text-orange-500" />;
    case "down":
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Activity className="w-5 h-5 text-gray-500" />;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "healthy":
      return <Badge className="bg-green-900 text-green-100">Healthy</Badge>;
    case "warning":
      return <Badge className="bg-yellow-900 text-yellow-100">Warning</Badge>;
    case "degraded":
      return <Badge className="bg-orange-900 text-orange-100">Degraded</Badge>;
    case "down":
      return <Badge variant="destructive">Down</Badge>;
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
}

function getUptimeColor(uptime: number) {
  if (uptime >= 99.9) return "bg-green-500";
  if (uptime >= 99) return "bg-yellow-500";
  if (uptime >= 95) return "bg-orange-500";
  return "bg-red-500";
}

export default function IntegrationHealth() {
  const healthyCount = mockIntegrations.filter((i) => i.status === "healthy").length;
  const warningCount = mockIntegrations.filter((i) => i.status === "warning").length;
  const degradedCount = mockIntegrations.filter((i) => i.status === "degraded").length;
  const downCount = mockIntegrations.filter((i) => i.status === "down").length;

  const totalRequests = mockIntegrations.reduce((sum, i) => sum + i.requestsPerHour, 0);
  const avgErrorRate =
    mockIntegrations.reduce((sum, i) => sum + i.errorRate, 0) / mockIntegrations.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Integration Health</h1>
        <p className="text-muted-foreground mt-1">Monitor the status and performance of all integrations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Healthy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{healthyCount}</div>
            <p className="text-xs text-muted-foreground mt-1">of {mockIntegrations.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warning</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{warningCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Degraded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{degradedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Performance issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Down</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{downCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Offline</p>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Total Requests/Hour</span>
              <span className="text-lg font-bold">{totalRequests.toLocaleString()}</span>
            </div>
            <Progress value={Math.min(totalRequests / 50, 100)} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Average Error Rate</span>
              <span className="text-lg font-bold">{avgErrorRate.toFixed(2)}%</span>
            </div>
            <Progress value={avgErrorRate} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Integration Details */}
      <div className="space-y-3">
        {mockIntegrations.map((integration) => (
          <Card key={integration.id} className="hover:border-blue-500/50 transition-colors">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(integration.status)}
                    <div>
                      <h3 className="font-semibold">{integration.name}</h3>
                      <p className="text-xs text-muted-foreground capitalize">{integration.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(integration.status)}
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  {/* Uptime */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Uptime</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getUptimeColor(integration.uptime)}`} />
                      <span className="font-semibold text-sm">{integration.uptime.toFixed(2)}%</span>
                    </div>
                  </div>

                  {/* Requests */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Requests/Hour</p>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-500" />
                      <span className="font-semibold text-sm">{integration.requestsPerHour}</span>
                    </div>
                  </div>

                  {/* Error Rate */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Error Rate</p>
                    <span className="font-semibold text-sm">{integration.errorRate.toFixed(2)}%</span>
                  </div>

                  {/* Response Time */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Avg Response</p>
                    <span className="font-semibold text-sm">{integration.avgResponseTime}ms</span>
                  </div>
                </div>

                {/* Status Bar */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                  <Clock className="w-4 h-4" />
                  <span>Last checked: {format(integration.lastCheck, "MMM d, h:mm a")}</span>
                  {integration.nextCheck && (
                    <>
                      <span>•</span>
                      <span>Next check: {format(integration.nextCheck, "h:mm a")}</span>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
