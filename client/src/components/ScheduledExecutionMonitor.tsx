import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Zap,
  TrendingUp,
} from 'lucide-react';

interface ScheduledProfile {
  id: string;
  profileId: string;
  cronExpression: string;
  enabled: boolean;
  nextExecutionAt?: string;
  lastExecutionAt?: string;
  lastExecutionStatus?: 'success' | 'failed' | 'pending';
  executionCount: number;
  failureCount: number;
  timezone: string;
  notifyOnFailure: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ExecutionLog {
  id: string;
  scheduleId: string;
  status: 'success' | 'failed' | 'skipped';
  startedAt: string;
  completedAt?: string;
  duration: number;
  error?: string;
  results?: any;
  createdAt: string;
}

interface ScheduledExecutionMonitorProps {
  schedules: ScheduledProfile[];
  executionLogs: Record<string, ExecutionLog[]>;
  onToggleSchedule?: (scheduleId: string, enabled: boolean) => void;
  onTriggerManual?: (scheduleId: string) => void;
  onDeleteSchedule?: (scheduleId: string) => void;
}

export const ScheduledExecutionMonitor: React.FC<ScheduledExecutionMonitorProps> = ({
  schedules,
  executionLogs,
  onToggleSchedule,
  onTriggerManual,
  onDeleteSchedule,
}) => {
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilNextExecution = (nextExecutionAt?: string) => {
    if (!nextExecutionAt) return 'Unknown';
    const now = new Date();
    const next = new Date(nextExecutionAt);
    const diff = next.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const getSuccessRate = (schedule: ScheduledProfile) => {
    if (schedule.executionCount === 0) return 0;
    return Math.round(
      ((schedule.executionCount - schedule.failureCount) / schedule.executionCount) * 100
    );
  };

  const getRecentLogs = (scheduleId: string, limit: number = 5) => {
    return (executionLogs[scheduleId] || []).slice(0, limit);
  };

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{schedules.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total Schedules</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {schedules.filter((s) => s.enabled).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Active</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {schedules.reduce((sum, s) => sum + s.failureCount, 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total Failures</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {Math.round(
                  schedules.reduce((sum, s) => sum + getSuccessRate(s), 0) / Math.max(schedules.length, 1)
                )}
                %
              </p>
              <p className="text-xs text-gray-500 mt-1">Avg Success Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedules List */}
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="pt-8 pb-8 text-center">
              <Calendar className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">No scheduled profiles</p>
              <p className="text-xs text-gray-400 mt-1">Create a schedule to automate profile execution</p>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => {
            const successRate = getSuccessRate(schedule);
            const recentLogs = getRecentLogs(schedule.id);
            const isExpanded = expandedSchedule === schedule.id;

            return (
              <Card
                key={schedule.id}
                className={`cursor-pointer transition ${schedule.enabled ? '' : 'opacity-60'}`}
                onClick={() => setExpandedSchedule(isExpanded ? null : schedule.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Schedule #{schedule.id.slice(-8)}</CardTitle>
                        <Badge variant={schedule.enabled ? 'default' : 'secondary'}>
                          {schedule.enabled ? 'Active' : 'Paused'}
                        </Badge>
                        {schedule.lastExecutionStatus && (
                          <Badge
                            variant={
                              schedule.lastExecutionStatus === 'success' ? 'default' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {schedule.lastExecutionStatus === 'success' ? '✓ Success' : '✗ Failed'}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Cron: <code className="bg-gray-100 px-1 rounded">{schedule.cronExpression}</code>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleSchedule?.(schedule.id, !schedule.enabled);
                          }}
                        >
                          {schedule.enabled ? (
                            <Pause className="w-3 h-3" />
                          ) : (
                            <Play className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTriggerManual?.(schedule.id);
                          }}
                        >
                          <Zap className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteSchedule?.(schedule.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Collapsed View */}
                {!isExpanded && (
                  <CardContent className="pb-3">
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-gray-500">Next Run</p>
                        <p className="font-mono">{getTimeUntilNextExecution(schedule.nextExecutionAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Last Run</p>
                        <p className="font-mono text-xs">{formatDate(schedule.lastExecutionAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Executions</p>
                        <p className="font-mono">{schedule.executionCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Success Rate</p>
                        <p className="font-mono text-green-600">{successRate}%</p>
                      </div>
                    </div>
                  </CardContent>
                )}

                {/* Expanded View */}
                {isExpanded && (
                  <CardContent className="space-y-4 border-t pt-4">
                    {/* Execution Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Success Rate</p>
                        <div className="space-y-1">
                          <Progress value={successRate} className="h-2" />
                          <p className="text-xs text-gray-600">
                            {schedule.executionCount - schedule.failureCount}/{schedule.executionCount}{' '}
                            successful
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Schedule Info</p>
                        <div className="text-xs space-y-1 text-gray-600">
                          <p>Timezone: {schedule.timezone}</p>
                          <p>
                            Notifications:{' '}
                            {schedule.notifyOnFailure ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Execution Logs */}
                    {recentLogs.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Recent Executions</p>
                        <div className="space-y-1">
                          {recentLogs.map((log) => (
                            <div
                              key={log.id}
                              className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded"
                            >
                              <div className="flex items-center gap-2">
                                {log.status === 'success' ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-red-600" />
                                )}
                                <span className="capitalize">{log.status}</span>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-600">
                                  {log.duration}ms • {formatDate(log.startedAt)}
                                </p>
                                {log.error && (
                                  <p className="text-red-600 truncate">{log.error}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timing Info */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-gray-600">Next Execution</p>
                        <p className="font-mono font-medium">{formatDate(schedule.nextExecutionAt)}</p>
                        <p className="text-gray-500 mt-1">
                          In {getTimeUntilNextExecution(schedule.nextExecutionAt)}
                        </p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-gray-600">Last Execution</p>
                        <p className="font-mono font-medium">{formatDate(schedule.lastExecutionAt)}</p>
                        <p className="text-gray-500 mt-1">
                          {schedule.lastExecutionStatus === 'success'
                            ? '✓ Successful'
                            : '✗ Failed'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Help Text */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Scheduling Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1 text-gray-700">
          <p>• Use cron expressions to define execution schedules (e.g., "0 9 * * *" for 9 AM daily)</p>
          <p>• Click the lightning bolt icon to manually trigger execution immediately</p>
          <p>• Pause schedules to temporarily disable without deleting configuration</p>
          <p>• Enable failure notifications to get alerts when executions fail</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduledExecutionMonitor;
