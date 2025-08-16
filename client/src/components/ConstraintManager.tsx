import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Activity } from "@shared/schema";
import { Target, Settings } from "lucide-react";

interface ConstraintManagerProps {
  activities: Activity[];
  projectId: string;
}

export default function ConstraintManager({ activities, projectId }: ConstraintManagerProps) {
  const constrainedActivities = activities.filter(a => a.constraintType && a.constraintDate);
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Constraint Management</span>
          </div>
          <Button size="sm" data-testid="button-manage-constraints">
            <Settings className="w-4 h-4 mr-2" />
            Manage
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {constrainedActivities.length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Constrained Activities
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {activities.filter(a => a.deadline).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                With Deadlines
              </div>
            </div>
          </div>
          
          <div className="text-center text-gray-500 py-8">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <h4 className="font-medium mb-2">Constraint Details</h4>
            <p className="text-sm">Advanced constraint management coming soon</p>
            <div className="text-xs text-left max-w-sm mx-auto mt-4 space-y-1">
              <p>Features will include:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>SNET/FNLT enforcement</li>
                <li>Must Start/Finish On dates</li>
                <li>Deadline tracking</li>
                <li>Constraint violation alerts</li>
                <li>Schedule optimization</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}