import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Wbs, Activity } from "@shared/schema";
import { Users, Plus } from "lucide-react";

interface WBSTreeProps {
  wbs: Wbs[];
  activities: Activity[];
  projectId: string;
}

export default function WBSTree({ wbs, activities, projectId }: WBSTreeProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Work Breakdown Structure</span>
          </div>
          <Button size="sm" data-testid="button-new-wbs">
            <Plus className="w-4 h-4 mr-2" />
            New WBS
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-500 py-12">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">WBS Structure</h3>
          <p className="text-sm mb-4">Hierarchical project breakdown coming soon</p>
          <div className="text-sm text-left max-w-md mx-auto space-y-2">
            <p>Features will include:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Hierarchical tree view</li>
              <li>Drag-and-drop organization</li>
              <li>Activity assignments</li>
              <li>Cost and progress rollups</li>
              <li>Export to various formats</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}