import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react';

interface AnalyticsData {
  profileId: string;
  profileName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  successRate: number;
  lastExecutedAt?: string;
  executionTrend: Array<{
    date: string;
    successful: number;
    failed: number;
    duration: number;
  }>;
  topErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
  recommendations: string[];
}

interface VoiceProfileAnalyticsProps {
  analytics: AnalyticsData;
}

export const VoiceProfileAnalytics: React.FC<VoiceProfileAnalyticsProps> = ({
  analytics,
}) => {
  const trendDirection = useMemo(() => {
    if (analytics.executionTrend.length < 2) return null;
    const recent = analytics.executionTrend.slice(-7);
    const recentSuccessRate =
      recent.reduce((sum, d) => sum + (d.successful / (d.successful + d.failed)), 0) /
      recent.length;
    const older = analytics.executionTrend.slice(0, 7);
    const olderSuccessRate =
      older.length > 0
        ? older.reduce((sum, d) => sum + (d.successful / (d.successful + d.failed)), 0) /
          older.length
        : 0;
    return recentSuccessRate > olderSuccessRate ? 'up' : 'down';
  }, [analytics.executionTrend]);

  const healthScore = useMemo(() => {
    let score = 100;
    if (analytics.successRate < 90) score -= (90 - analytics.successRate) * 0.5;
    if (analytics.averageExecutionTime > 5000) score -= 10;
    if (analytics.totalExecutions === 0) score = 0;
    return Math.max(0, Math.round(score));
  }, [analytics.successRate, analytics.averageExecutionTime, analytics.totalExecutions]);

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (score: number) => {
    if (score >= 90) return 'bg-green-50';
    if (score >= 70) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  return (
    <div className="space-y-4">
      {/* Health Score Card */}
      <Card className={`border-2 ${getHealthBg(healthScore)}`}>
        <CardHeader>
          <CardTitle className="text-lg">Profile Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-4xl font-bold ${getHealthColor(healthScore)}`}>
                {healthScore}%
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {healthScore >= 90
                  ? 'Excellent'
                  : healthScore >= 70
                    ? 'Good'
                    : 'Needs Attention'}
              </p>
            </div>
            <div className="text-right space-y-2">
              <div className="flex items-center gap-2">
                {trendDirection === 'up' ? (
                  <TrendingUp className="w-5 h-5 text-green-600" />
                ) : trendDirection === 'down' ? (
                  <TrendingDown className="w-5 h-5 text-red-600" />
                ) : null}
                <span className="text-sm text-gray-600">
                  {trendDirection === 'up'
                    ? 'Improving'
                    : trendDirection === 'down'
                      ? 'Declining'
                      : 'Stable'}
                </span>
              </div>
              {analytics.lastExecutedAt && (
                <p className="text-xs text-gray-500">
                  Last: {new Date(analytics.lastExecutedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{analytics.totalExecutions}</p>
              <p className="text-xs text-gray-500 mt-1">Total Executions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {analytics.successfulExecutions}
              </p>
              <p className="text-xs text-gray-500 mt-1">Successful</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{analytics.failedExecutions}</p>
              <p className="text-xs text-gray-500 mt-1">Failed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{analytics.successRate}%</p>
              <p className="text-xs text-gray-500 mt-1">Success Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Avg. Execution Time</span>
              <span className="text-sm font-mono">
                {(analytics.averageExecutionTime / 1000).toFixed(2)}s
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(100, (analytics.averageExecutionTime / 10000) * 100)}%`,
                }}
              />
            </div>
          </div>
          <div className="text-xs text-gray-600">
            {analytics.averageExecutionTime < 1000
              ? '⚡ Very Fast'
              : analytics.averageExecutionTime < 5000
                ? '✓ Normal'
                : '⚠️ Slow - Consider optimization'}
          </div>
        </CardContent>
      </Card>

      {/* Top Errors */}
      {analytics.topErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Top Errors
            </CardTitle>
            <CardDescription>Most common failure reasons</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {analytics.topErrors.map((error, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{error.error}</p>
                </div>
                <div className="text-right ml-2">
                  <Badge variant="outline" className="text-xs">
                    {error.count}x
                  </Badge>
                  <p className="text-xs text-gray-500 mt-1">{error.percentage}%</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analytics.recommendations.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-600" />
              Optimization Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analytics.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-yellow-600 font-bold">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Execution Trend Chart (Text-based) */}
      {analytics.executionTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Execution Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.executionTrend.slice(-7).map((day, idx) => {
                const total = day.successful + day.failed;
                const successPercent = total > 0 ? (day.successful / total) * 100 : 0;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{day.date}</span>
                      <span className="text-xs text-gray-500">
                        {day.successful}✓ {day.failed}✗
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 flex overflow-hidden">
                      <div
                        className="bg-green-600 h-2"
                        style={{ width: `${successPercent}%` }}
                      />
                      <div
                        className="bg-red-600 h-2"
                        style={{ width: `${100 - successPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {analytics.totalExecutions === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <p className="text-gray-500">No execution data yet</p>
            <p className="text-xs text-gray-400 mt-1">Run this profile to see analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VoiceProfileAnalytics;
