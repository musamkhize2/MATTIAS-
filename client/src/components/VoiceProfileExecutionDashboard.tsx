import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Clock, Play, Pause, RotateCcw } from 'lucide-react';

interface ExecutionStep {
  commandId: string;
  action: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  duration: number;
  startedAt?: string;
  completedAt?: string;
}

interface ExecutionSession {
  id: string;
  profileName: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
  steps: ExecutionStep[];
  startedAt: string;
  completedAt?: string;
  totalDuration: number;
  successRate: number;
  error?: string;
}

interface VoiceProfileExecutionDashboardProps {
  execution: ExecutionSession;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
  isLive?: boolean;
}

export const VoiceProfileExecutionDashboard: React.FC<
  VoiceProfileExecutionDashboardProps
> = ({ execution, onPause, onResume, onCancel, onRetry, isLive = false }) => {
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const completedSteps = execution.steps.filter((s) => s.status === 'completed').length;
  const failedSteps = execution.steps.filter((s) => s.status === 'failed').length;
  const progress = (completedSteps / execution.steps.length) * 100;

  const getStatusIcon = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'executing':
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStatusColor = (status: ExecutionSession['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'failed':
        return 'bg-red-50 border-red-200';
      case 'executing':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className={`border-2 ${getStatusColor(execution.status)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{execution.profileName}</CardTitle>
              <CardDescription>Execution ID: {execution.id}</CardDescription>
            </div>
            <Badge
              variant={
                execution.status === 'completed'
                  ? 'default'
                  : execution.status === 'failed'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {execution.status.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-mono text-sm">
                {completedSteps}/{execution.steps.length}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Timing Info */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Started</p>
              <p className="font-mono text-xs">{formatTime(execution.startedAt)}</p>
            </div>
            <div>
              <p className="text-gray-500">Duration</p>
              <p className="font-mono text-xs">{formatDuration(execution.totalDuration)}</p>
            </div>
            <div>
              <p className="text-gray-500">Success Rate</p>
              <p className="font-mono text-xs">{execution.successRate}%</p>
            </div>
          </div>

          {/* Error Message */}
          {execution.error && (
            <div className="bg-red-50 border border-red-200 rounded p-2">
              <p className="text-sm text-red-700">
                <AlertCircle className="inline w-4 h-4 mr-2" />
                {execution.error}
              </p>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2 pt-2">
            {execution.status === 'executing' && (
              <>
                {onPause && (
                  <Button size="sm" variant="outline" onClick={onPause}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                )}
                {onCancel && (
                  <Button size="sm" variant="outline" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
              </>
            )}
            {execution.status === 'pending' && onResume && (
              <Button size="sm" variant="outline" onClick={onResume}>
                <Play className="w-4 h-4 mr-2" />
                Start
              </Button>
            )}
            {(execution.status === 'completed' || execution.status === 'failed') &&
              onRetry && (
                <Button size="sm" variant="outline" onClick={onRetry}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Execution Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-96 overflow-y-auto">
          {execution.steps.map((step, idx) => (
            <div
              key={step.commandId}
              className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 transition"
              onClick={() =>
                setExpandedStep(expandedStep === step.commandId ? null : step.commandId)
              }
            >
              {/* Step Header */}
              <div className="flex items-center gap-3">
                {getStatusIcon(step.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">
                    Step {idx + 1}: {step.action}
                  </p>
                  {step.status === 'executing' && isLive && (
                    <p className="text-xs text-blue-600">Running...</p>
                  )}
                  {step.error && (
                    <p className="text-xs text-red-600 truncate">{step.error}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-mono">
                    {formatDuration(step.duration)}
                  </p>
                  {step.completedAt && (
                    <p className="text-xs text-gray-400">{formatTime(step.completedAt)}</p>
                  )}
                </div>
              </div>

              {/* Expanded Details */}
              {expandedStep === step.commandId && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs font-mono text-gray-600 break-all">
                      {JSON.stringify(step.result || {}, null, 2)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{completedSteps}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{failedSteps}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {execution.steps.length - completedSteps - failedSteps}
              </p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{execution.successRate}%</p>
              <p className="text-xs text-gray-500">Success Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-scroll Toggle */}
      <div className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          id="autoscroll"
          checked={autoScroll}
          onChange={(e) => setAutoScroll(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="autoscroll" className="text-gray-600">
          Auto-scroll to latest step
        </label>
      </div>
    </div>
  );
};

export default VoiceProfileExecutionDashboard;
