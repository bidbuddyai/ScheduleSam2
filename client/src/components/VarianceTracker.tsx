import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingDown, TrendingUp, AlertTriangle, Clock, 
  Calendar, Target, CheckCircle, XCircle,
  BarChart3, Activity
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";


interface VarianceTrackerProps {
  projectId: string;
  activities: any[];
}

interface VarianceData {
  activityId: string;
  name: string;
  currentStart: string | null;
  currentFinish: string | null;
  baselineStart: string | null;
  baselineFinish: string | null;
  startVariance: number;
  finishVariance: number;
  durationVariance: number;
  costVariance: number;
  isSlipping: boolean;
  isCritical: boolean;
}

interface Baseline {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function VarianceTracker({ projectId, activities }: VarianceTrackerProps) {
  const [selectedBaselineId, setSelectedBaselineId] = useState<string | null>(null);
  const [showOnlyVariances, setShowOnlyVariances] = useState(false);

  // Fetch baselines for selection
  const { data: baselines = [] } = useQuery<Baseline[]>({
    queryKey: ['/api/projects', projectId, 'baselines'],
    staleTime: 0
  });

  // Fetch variance data
  const { data: varianceData = [], isLoading: isLoadingVariance } = useQuery<VarianceData[]>({
    queryKey: ['/api/projects', projectId, 'variance', selectedBaselineId],
    enabled: !!selectedBaselineId,
    refetchOnMount: true,
    staleTime: 0
  });

  // Set default baseline on load
  useEffect(() => {
    if (baselines.length > 0 && !selectedBaselineId) {
      const activeBaseline = baselines.find(b => b.isActive);
      if (activeBaseline) {
        setSelectedBaselineId(activeBaseline.id);
      }
    }
  }, [baselines, selectedBaselineId]);

  // Calculate statistics
  const totalActivities = varianceData.length;
  const slippingActivities = varianceData.filter(v => v.isSlipping).length;
  const criticalSlippingActivities = varianceData.filter(v => v.isSlipping && v.isCritical).length;
  const averageFinishVariance = totalActivities > 0 ? 
    varianceData.reduce((sum, v) => sum + v.finishVariance, 0) / totalActivities : 0;

  // Filter data based on settings
  const filteredData = showOnlyVariances 
    ? varianceData.filter(v => Math.abs(v.startVariance) > 0 || Math.abs(v.finishVariance) > 0 || Math.abs(v.durationVariance) > 0)
    : varianceData;

  const formatVariance = (variance: number, unit: string = "days") => {
    if (variance === 0) return <span className="text-gray-500">No variance</span>;
    const color = variance > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400";
    const icon = variance > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
    return (
      <div className={`flex items-center space-x-1 ${color}`}>
        {icon}
        <span>{Math.abs(variance).toFixed(1)} {unit} {variance > 0 ? "behind" : "ahead"}</span>
      </div>
    );
  };

  const getVarianceRowClass = (variance: VarianceData) => {
    if (variance.isCritical && variance.isSlipping) {
      return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800";
    } else if (variance.isSlipping) {
      return "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800";
    } else if (variance.finishVariance < -5) {
      return "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800";
    }
    return "";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold">Schedule Variance Analysis</h2>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant={showOnlyVariances ? "default" : "outline"}
            size="sm"
            onClick={() => setShowOnlyVariances(!showOnlyVariances)}
            data-testid="button-toggle-variance-filter"
          >
            <Activity className="w-4 h-4 mr-2" />
            {showOnlyVariances ? "Show All" : "Show Variances Only"}
          </Button>
        </div>
      </div>

      {/* Baseline Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Baseline Comparison</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Compare Against:</label>
            <Select
              value={selectedBaselineId || ""}
              onValueChange={(value) => setSelectedBaselineId(value)}
            >
              <SelectTrigger className="w-64" data-testid="select-variance-baseline">
                <SelectValue placeholder="Select baseline for comparison" />
              </SelectTrigger>
              <SelectContent>
                {baselines.map(baseline => (
                  <SelectItem key={baseline.id} value={baseline.id}>
                    <div className="flex items-center space-x-2">
                      {baseline.isActive && <CheckCircle className="w-4 h-4 text-green-500" />}
                      <span>{baseline.name}</span>
                      {baseline.isActive && <Badge variant="secondary" className="text-xs">Active</Badge>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedBaselineId && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Comparing current schedule against: <strong>{baselines.find(b => b.id === selectedBaselineId)?.name}</strong>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variance Statistics */}
      {selectedBaselineId && varianceData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Activities Slipping</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{slippingActivities}</p>
                </div>
                <div className="h-8 w-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {totalActivities > 0 ? ((slippingActivities / totalActivities) * 100).toFixed(1) : 0}% of total activities
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Critical Slipping</p>
                  <p className="text-2xl font-bold text-red-800 dark:text-red-300">{criticalSlippingActivities}</p>
                </div>
                <div className="h-8 w-8 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-800 dark:text-red-300" />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Critical path affected</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Variance</p>
                  <p className={`text-2xl font-bold ${averageFinishVariance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {averageFinishVariance.toFixed(1)} days
                  </p>
                </div>
                <div className={`h-8 w-8 ${averageFinishVariance > 0 ? 'bg-red-100 dark:bg-red-900' : 'bg-green-100 dark:bg-green-900'} rounded-full flex items-center justify-center`}>
                  {averageFinishVariance > 0 ? 
                    <TrendingUp className={`h-5 w-5 text-red-600 dark:text-red-400`} /> :
                    <TrendingDown className={`h-5 w-5 text-green-600 dark:text-green-400`} />
                  }
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Finish date variance</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Activities</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalActivities}</p>
                </div>
                <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In comparison</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Variance Table */}
      {selectedBaselineId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Activity Variance Details</span>
              </div>
              <Badge variant="outline">
                {filteredData.length} of {totalActivities} activities
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingVariance ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500">Loading variance data...</div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No variance data available</p>
                <p className="text-sm">Select a baseline to compare against current schedule</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead>Current Dates</TableHead>
                      <TableHead>Baseline Dates</TableHead>
                      <TableHead className="text-center">Start Variance</TableHead>
                      <TableHead className="text-center">Finish Variance</TableHead>
                      <TableHead className="text-center">Duration Variance</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((variance) => (
                      <TableRow 
                        key={variance.activityId}
                        className={getVarianceRowClass(variance)}
                        data-testid={`row-variance-${variance.activityId}`}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{variance.name}</div>
                            <div className="text-xs text-gray-500">{variance.activityId}</div>
                            {variance.isCritical && (
                              <Badge variant="destructive" className="text-xs">Critical</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {variance.currentStart && (
                              <div>Start: {new Date(variance.currentStart).toLocaleDateString()}</div>
                            )}
                            {variance.currentFinish && (
                              <div>Finish: {new Date(variance.currentFinish).toLocaleDateString()}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1 text-gray-600">
                            {variance.baselineStart && (
                              <div>Start: {new Date(variance.baselineStart).toLocaleDateString()}</div>
                            )}
                            {variance.baselineFinish && (
                              <div>Finish: {new Date(variance.baselineFinish).toLocaleDateString()}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {formatVariance(variance.startVariance)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatVariance(variance.finishVariance)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatVariance(variance.durationVariance, "days")}
                        </TableCell>
                        <TableCell className="text-center">
                          {variance.isSlipping ? (
                            <Badge variant="destructive" className="flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3" />
                              <span>Slipping</span>
                            </Badge>
                          ) : variance.finishVariance < 0 ? (
                            <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center space-x-1">
                              <CheckCircle className="w-3 h-3" />
                              <span>Ahead</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline">On Track</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {baselines.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-medium mb-2">No Baselines Available</h3>
            <p className="text-gray-500 mb-4">Create a baseline first to track schedule variance</p>
            <Button onClick={() => {}} className="mt-2">
              <Target className="w-4 h-4 mr-2" />
              Go to Baselines Tab
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}