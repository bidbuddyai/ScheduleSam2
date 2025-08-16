import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project, Activity } from "@shared/schema";
import { Clock, TrendingUp, AlertTriangle, Calendar } from "lucide-react";

interface ProgressTrackerProps {
  project: Project;
  activities: Activity[];
  projectId: string;
}

export default function ProgressTracker({ project, activities, projectId }: ProgressTrackerProps) {
  const totalActivities = activities.length;
  const completedActivities = activities.filter(a => a.status === "Completed").length;
  const inProgressActivities = activities.filter(a => a.status === "InProgress").length;
  const overallProgress = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;
  
  const dataDate = project.dataDate ? new Date(project.dataDate) : null;
  const today = new Date();
  const isDataDateCurrent = dataDate && Math.abs(today.getTime() - dataDate.getTime()) < (7 * 24 * 60 * 60 * 1000); // Within 7 days

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>Progress Tracking</span>
          </div>
          <div className="flex items-center space-x-2">
            {!isDataDateCurrent && (
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Data Date Outdated
              </Badge>
            )}
            <Button size="sm" data-testid="button-update-progress">
              <Calendar className="w-4 h-4 mr-2" />
              Update Progress
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-500">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{completedActivities} completed</span>
            <span>{inProgressActivities} in progress</span>
            <span>{totalActivities - completedActivities - inProgressActivities} not started</span>
          </div>
        </div>

        {/* Data Date Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Data Date</div>
            <div className="text-sm">
              {dataDate ? dataDate.toLocaleDateString() : 'Not set'}
            </div>
            {dataDate && (
              <div className="text-xs text-gray-500 mt-1">
                {Math.ceil((today.getTime() - dataDate.getTime()) / (1000 * 60 * 60 * 24))} days ago
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Progress Method</div>
            <div className="text-sm">Retained Logic</div>
            <div className="text-xs text-gray-500 mt-1">
              Out-of-sequence activities retain original logic
            </div>
          </div>
        </div>

        {/* Progress Features Placeholder */}
        <div className="text-center text-gray-500 py-8">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <h4 className="font-medium mb-2">Advanced Progress Features</h4>
          <p className="text-sm mb-4">Comprehensive progress tracking coming soon</p>
          <div className="text-xs text-left max-w-sm mx-auto space-y-1">
            <p>Features will include:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Earned value analysis</li>
              <li>Schedule performance index</li>
              <li>Out-of-sequence progress handling</li>
              <li>Progress override vs retained logic</li>
              <li>Performance trend analysis</li>
              <li>Recovery schedule planning</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}