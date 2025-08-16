import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Activity, Relationship, Wbs } from "@shared/schema";
import { BarChart3 } from "lucide-react";

interface GanttChartProps {
  activities: Activity[];
  relationships: Relationship[];
  wbs: Wbs[];
  onActivitySelect: (activityId: string) => void;
}

export default function GanttChart({ 
  activities, 
  relationships, 
  wbs, 
  onActivitySelect 
}: GanttChartProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5" />
          <span>Gantt Chart</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-500 py-12">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Gantt Chart View</h3>
          <p className="text-sm mb-4">Interactive timeline visualization coming soon</p>
          <div className="text-sm text-left max-w-md mx-auto space-y-2">
            <p>Features will include:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Visual timeline with activity bars</li>
              <li>Relationship links between activities</li>
              <li>Critical path highlighting</li>
              <li>Drag-and-drop scheduling</li>
              <li>Zoom and pan controls</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}