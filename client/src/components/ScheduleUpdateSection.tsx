import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, RefreshCw, CheckCircle, Clock } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScheduleUpdateSectionProps {
  meetingId: string;
  projectId: string;
}

export default function ScheduleUpdateSection({ meetingId, projectId }: ScheduleUpdateSectionProps) {
  const { toast } = useToast();
  const [updateResult, setUpdateResult] = useState<any>(null);
  
  // Update schedule from meeting discussion
  const updateScheduleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/update-schedule`, {});
      return response.json();
    },
    onSuccess: (data) => {
      setUpdateResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "schedules"] });
      toast({
        title: "Schedule Analysis Complete",
        description: `Applied ${data?.appliedUpdates || 0} updates from meeting discussion.`,
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to analyze meeting discussion for schedule updates.",
        variant: "destructive",
      });
    },
  });
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-2">AI-Powered Schedule Updates</h4>
          <p className="text-sm text-gray-600 mb-4">
            Analyze the meeting discussion to automatically identify and apply schedule updates.
            The AI will review agenda discussions and action items to suggest changes to activity
            statuses, dates, and dependencies.
          </p>
          
          <Button
            onClick={() => updateScheduleMutation.mutate()}
            disabled={updateScheduleMutation.isPending}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${updateScheduleMutation.isPending ? 'animate-spin' : ''}`} />
            {updateScheduleMutation.isPending ? 'Analyzing Meeting...' : 'Update Schedule from Meeting'}
          </Button>
        </div>
        
        {updateResult && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Schedule Update Results:</p>
                <ul className="text-sm space-y-1">
                  <li>• {updateResult.appliedUpdates} activities updated</li>
                  {updateResult.suggestions?.map((suggestion: string, idx: number) => (
                    <li key={idx}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        {updateResult?.updates && updateResult.updates.length > 0 && (
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">Applied Updates:</h4>
            <div className="space-y-2">
              {updateResult.updates.map((update: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{update.activityId}:</span>
                    <span className="ml-2 text-gray-600">
                      {update.field} changed from "{update.oldValue}" to "{update.newValue}"
                    </span>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    <Clock className="h-3 w-3 mr-1" />
                    Updated
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}