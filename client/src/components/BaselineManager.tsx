import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Activity, Relationship } from "@shared/schema";
import { Target, Plus } from "lucide-react";

interface BaselineManagerProps {
  projectId: string;
  activities: Activity[];
  relationships: Relationship[];
}

export default function BaselineManager({ projectId, activities, relationships }: BaselineManagerProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Baseline Management</span>
          </div>
          <Button size="sm" data-testid="button-new-baseline">
            <Plus className="w-4 h-4 mr-2" />
            Create Baseline
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-500 py-12">
          <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Schedule Baselines</h3>
          <p className="text-sm mb-4">Baseline comparison and analysis coming soon</p>
          <div className="text-sm text-left max-w-md mx-auto space-y-2">
            <p>Features will include:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Multiple baseline snapshots</li>
              <li>Schedule variance analysis</li>
              <li>Performance measurement</li>
              <li>Earned value calculations</li>
              <li>Progress tracking reports</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}