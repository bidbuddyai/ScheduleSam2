import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Activity, Relationship } from "@shared/schema";
import { AlertTriangle, Plus } from "lucide-react";

interface TIAManagerProps {
  projectId: string;
  activities: Activity[];
  relationships: Relationship[];
}

export default function TIAManager({ projectId, activities, relationships }: TIAManagerProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            <span>Time Impact Analysis</span>
          </div>
          <Button size="sm" data-testid="button-new-tia">
            <Plus className="w-4 h-4 mr-2" />
            New TIA Scenario
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-500 py-12">
          <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Time Impact Analysis</h3>
          <p className="text-sm mb-4">Schedule impact analysis tools coming soon</p>
          <div className="text-sm text-left max-w-md mx-auto space-y-2">
            <p>Features will include:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>What-if scenario modeling</li>
              <li>Delay impact calculations</li>
              <li>Critical path analysis</li>
              <li>Schedule compression studies</li>
              <li>Risk mitigation planning</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}