import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import MATTIASLayout from "./components/MATTIASLayout";
import CommandCenter from "./pages/CommandCenter";
import EventLog from "./pages/EventLog";
import ApprovalQueue from "./pages/ApprovalQueue";
import AgentPage from "./pages/AgentPage";
import AutonomySettings from "./pages/AutonomySettings";
import MemoryExplorer from "./pages/MemoryExplorer";
import PolicyManager from "./pages/PolicyManager";
import Dashboard from "./pages/Dashboard";
import CRMMarketplace from "./pages/CRMMarketplace";
import DataSources from "./pages/DataSources";
import WorkflowBuilder from "./pages/WorkflowBuilder";
import VoiceInterface from "./pages/VoiceInterface";
import BusinessProfiles from "./pages/BusinessProfiles";
import WebhookReplay from "./pages/WebhookReplay";
import ApprovalReasoning from "./pages/ApprovalReasoning";
import AgentFineTuning from "./pages/AgentFineTuning";
import { CredentialManager } from "./pages/CredentialManager";
import IntegrationHealth from "./pages/IntegrationHealth";
import MarketingCampaigns from "./pages/MarketingCampaigns";

function Router() {
  return (
    <MATTIASLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/command" component={CommandCenter} />
        <Route path="/events" component={EventLog} />
        <Route path="/approvals" component={ApprovalQueue} />
        <Route path="/agents/:agentSlug" component={AgentPage} />
        <Route path="/autonomy" component={AutonomySettings} />
        <Route path="/memory" component={MemoryExplorer} />
        <Route path="/policies" component={PolicyManager} />
        <Route path="/crm-marketplace" component={CRMMarketplace} />
        <Route path="/data-sources" component={DataSources} />
      <Route path={"/workflow-builder"} component={WorkflowBuilder} />
      <Route path={"/voice-interface"} component={VoiceInterface} />
      <Route path={"/business-profiles"} component={BusinessProfiles} />
        <Route path="/webhook-replay" component={WebhookReplay} />
        <Route path="/approval-reasoning" component={ApprovalReasoning} />
        <Route path="/agent-fine-tuning" component={AgentFineTuning} />
        <Route path="/credentials" component={CredentialManager} />
        <Route path="/integration-health" component={IntegrationHealth} />
        <Route path="/campaigns" component={MarketingCampaigns} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </MATTIASLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "oklch(0.13 0.015 260)",
                border: "1px solid oklch(0.22 0.02 260)",
                color: "oklch(0.95 0.01 260)",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
