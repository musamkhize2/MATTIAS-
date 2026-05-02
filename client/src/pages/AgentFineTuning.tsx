import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Settings, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const AGENTS = [
  { name: "Operations", icon: "⚙️", color: "bg-blue-500" },
  { name: "Finance", icon: "💰", color: "bg-green-500" },
  { name: "Sales", icon: "📈", color: "bg-purple-500" },
  { name: "Marketing", icon: "📢", color: "bg-pink-500" },
  { name: "Knowledge", icon: "📚", color: "bg-yellow-500" },
  { name: "Personal Life", icon: "🎯", color: "bg-indigo-500" },
  { name: "Communication", icon: "💬", color: "bg-cyan-500" },
  { name: "Compliance & Risk", icon: "🛡️", color: "bg-red-500" },
];

interface AgentConfig {
  personality: number; // 0 = conservative, 100 = aggressive
  riskTolerance: number; // 0 = risk-averse, 100 = risk-seeking
  reasoning: string;
  performanceScore: number;
}

export default function AgentFineTuning() {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]?.name || "Operations");
  const [configs, setConfigs] = useState<Record<string, AgentConfig>>({
    Operations: {
      personality: 50,
      riskTolerance: 40,
      reasoning: "Balanced approach to operational decisions with focus on efficiency.",
      performanceScore: 87,
    },
    Finance: {
      personality: 30,
      riskTolerance: 20,
      reasoning: "Conservative financial management with emphasis on risk mitigation.",
      performanceScore: 92,
    },
    Sales: {
      personality: 80,
      riskTolerance: 75,
      reasoning: "Aggressive sales strategies with calculated risk-taking for growth.",
      performanceScore: 78,
    },
    Marketing: {
      personality: 70,
      riskTolerance: 65,
      reasoning: "Creative and bold marketing campaigns with measured experimentation.",
      performanceScore: 81,
    },
    Knowledge: {
      personality: 60,
      riskTolerance: 50,
      reasoning: "Balanced knowledge synthesis with thorough research and validation.",
      performanceScore: 89,
    },
    "Personal Life": {
      personality: 55,
      riskTolerance: 45,
      reasoning: "Balanced personal life decisions with consideration of well-being.",
      performanceScore: 75,
    },
    Communication: {
      personality: 65,
      riskTolerance: 55,
      reasoning: "Diplomatic communication with clear and empathetic messaging.",
      performanceScore: 84,
    },
    "Compliance & Risk": {
      personality: 25,
      riskTolerance: 15,
      reasoning: "Strict compliance focus with comprehensive risk assessment.",
      performanceScore: 95,
    },
  });

  const currentConfig = configs[selectedAgent] || {
    personality: 50,
    riskTolerance: 50,
    reasoning: "",
    performanceScore: 0,
  };

  const handlePersonalityChange = (value: number[]) => {
    setConfigs({
      ...configs,
      [selectedAgent]: {
        ...currentConfig,
        personality: value[0] || 50,
      },
    });
  };

  const handleRiskToleranceChange = (value: number[]) => {
    setConfigs({
      ...configs,
      [selectedAgent]: {
        ...currentConfig,
        riskTolerance: value[0] || 50,
      },
    });
  };

  const handleReasoningChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConfigs({
      ...configs,
      [selectedAgent]: {
        ...currentConfig,
        reasoning: e.target.value,
      },
    });
  };

  const handleSave = () => {
    toast.success(`${selectedAgent} configuration saved successfully`);
  };

  const handleReset = () => {
    setConfigs({
      ...configs,
      [selectedAgent]: {
        personality: 50,
        riskTolerance: 50,
        reasoning: "",
        performanceScore: 0,
      },
    });
    toast.info(`${selectedAgent} configuration reset to defaults`);
  };

  const handleABTest = () => {
    toast.success(`A/B test started for ${selectedAgent}. Monitoring performance...`);
  };

  const getPersonalityLabel = (value: number) => {
    if (value < 30) return "Very Conservative";
    if (value < 50) return "Conservative";
    if (value < 70) return "Balanced";
    if (value < 85) return "Aggressive";
    return "Very Aggressive";
  };

  const getRiskLabel = (value: number) => {
    if (value < 30) return "Very Risk-Averse";
    if (value < 50) return "Risk-Averse";
    if (value < 70) return "Balanced";
    if (value < 85) return "Risk-Seeking";
    return "Very Risk-Seeking";
  };

  const agent = AGENTS.find((a) => a.name === selectedAgent);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Brain className="w-8 h-8 text-blue-400" />
        <div>
          <h1 className="text-3xl font-bold">Agent Fine-Tuning</h1>
          <p className="text-gray-400">Customize agent personalities, risk tolerance, and reasoning prompts</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Agent Selector */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Select Agent</h3>
          <div className="space-y-2">
            {AGENTS.map((a) => (
              <button
                key={a.name}
                onClick={() => setSelectedAgent(a.name)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedAgent === a.name
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span className="text-lg mr-2">{a.icon}</span>
                {a.name}
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="lg:col-span-3 space-y-4">
          {agent && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{agent.icon}</span>
                    <div>
                      <CardTitle>{agent.name} Agent</CardTitle>
                      <CardDescription>Fine-tune behavior and decision-making</CardDescription>
                    </div>
                  </div>
                  <Badge className={`${agent.color} text-white`}>Performance: {currentConfig.performanceScore}%</Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <Tabs defaultValue="personality" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                    <TabsTrigger value="personality">Personality</TabsTrigger>
                    <TabsTrigger value="risk">Risk Tolerance</TabsTrigger>
                    <TabsTrigger value="reasoning">Reasoning</TabsTrigger>
                  </TabsList>

                  <TabsContent value="personality" className="space-y-4 mt-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium">Personality Style</label>
                        <span className="text-sm text-blue-400 font-semibold">
                          {getPersonalityLabel(currentConfig.personality)}
                        </span>
                      </div>
                      <Slider
                        value={[currentConfig.personality]}
                        onValueChange={handlePersonalityChange}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Conservative</span>
                        <span>Aggressive</span>
                      </div>
                    </div>

                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-300">
                        <strong>Impact:</strong> Determines how the agent approaches decision-making. Conservative agents
                        prefer proven strategies, while aggressive agents explore novel approaches.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="risk" className="space-y-4 mt-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium">Risk Tolerance</label>
                        <span className="text-sm text-green-400 font-semibold">
                          {getRiskLabel(currentConfig.riskTolerance)}
                        </span>
                      </div>
                      <Slider
                        value={[currentConfig.riskTolerance]}
                        onValueChange={handleRiskToleranceChange}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>Risk-Averse</span>
                        <span>Risk-Seeking</span>
                      </div>
                    </div>

                    <div className="bg-gray-800 p-3 rounded-lg">
                      <p className="text-sm text-gray-300">
                        <strong>Impact:</strong> Controls how much risk the agent is willing to accept. Higher values allow
                        for more aggressive strategies with potential for higher rewards.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="reasoning" className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium block mb-2">Custom Reasoning Prompt</label>
                      <Textarea
                        value={currentConfig.reasoning}
                        onChange={handleReasoningChange}
                        placeholder="Enter custom reasoning instructions for this agent..."
                        className="min-h-32 bg-gray-800 border-gray-700 text-white placeholder-gray-500"
                      />
                    </div>

                    <div className="bg-blue-900 border border-blue-700 p-3 rounded-lg flex gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-200">
                        Custom reasoning prompts override default behavior. Use clear, specific instructions for best
                        results.
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t border-gray-800">
                  <Button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Save Configuration
                  </Button>
                  <Button onClick={handleABTest} variant="outline" className="flex-1 border-gray-700 hover:bg-gray-800">
                    <Zap className="w-4 h-4 mr-2" />
                    Start A/B Test
                  </Button>
                  <Button onClick={handleReset} variant="ghost" className="flex-1 hover:bg-gray-800">
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Success Rate</p>
                  <p className="text-2xl font-bold text-green-400">{currentConfig.performanceScore}%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Avg Response Time</p>
                  <p className="text-2xl font-bold text-blue-400">1.2s</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-4">
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-1">Decisions Made</p>
                  <p className="text-2xl font-bold text-purple-400">847</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
