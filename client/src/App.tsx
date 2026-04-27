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
        <Route path="/workflows" component={WorkflowBuilder} />
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
