import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Upload, FileText, RefreshCw, AlertCircle, Plus, Sparkles } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import InteractiveScheduleCreator from "./InteractiveScheduleCreator";
import type { ProjectSchedule, ScheduleActivity } from "@shared/schema";

interface ScheduleManagerProps {
  projectId: string;
  meetingId?: string;
}

export default function ScheduleManager({ projectId, meetingId }: ScheduleManagerProps) {
  const { toast } = useToast();
  const [selectedSchedule, setSelectedSchedule] = useState<string | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [uploadType, setUploadType] = useState<"CPM" | "3_WEEK_LOOKAHEAD">("CPM");
  const [fileContent, setFileContent] = useState<string>("");
  
  // Fetch schedules
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<ProjectSchedule[]>({
    queryKey: ["/api/projects", projectId, "schedules"],
  });
  
  // Fetch activities for selected schedule
  const { data: activities = [], isLoading: activitiesLoading } = useQuery<ScheduleActivity[]>({
    queryKey: ["/api/schedules", selectedSchedule, "activities"],
    enabled: !!selectedSchedule,
  });
  
  // Upload schedule mutation
  const uploadScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/schedules/upload`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "schedules"] });
      setShowUploadDialog(false);
      setFileContent("");
      toast({
        title: "Schedule uploaded",
        description: "The schedule has been processed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed", 
        description: "Failed to process the schedule file.",
        variant: "destructive",
      });
    },
  });
  
  // Generate lookahead mutation
  const generateLookaheadMutation = useMutation({
    mutationFn: async (baseScheduleId: string) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/schedules/generate-lookahead`, {
        baseScheduleId,
        startDate: new Date().toISOString().split('T')[0]
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "schedules"] });
      toast({
        title: "Lookahead generated",
        description: "3-week lookahead has been created from the CPM schedule.",
      });
    },
  });
  
  // Update schedule from meeting
  const updateFromMeetingMutation = useMutation({
    mutationFn: async () => {
      if (!meetingId) return;
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/update-schedule`, {});
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({
        title: "Schedule updated",
        description: `Applied ${data?.appliedUpdates || 0} updates from meeting discussion.`,
      });
    },
  });
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileContent(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };
  
  const handleScheduleUpload = () => {
    if (!fileContent) {
      toast({
        title: "No file selected",
        description: "Please select a schedule file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    uploadScheduleMutation.mutate({
      scheduleType: uploadType,
      fileContent,
      dataDate: new Date().toISOString().split('T')[0]
    });
  };
  
  const cpmSchedules = schedules.filter(s => s.scheduleType === "CPM");
  const lookaheadSchedules = schedules.filter(s => s.scheduleType === "3_WEEK_LOOKAHEAD");
  const currentSchedule = schedules.find(s => s.id === selectedSchedule);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Schedule Management
            </CardTitle>
            <div className="flex gap-2">
              {meetingId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => updateFromMeetingMutation.mutate()}
                  disabled={updateFromMeetingMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Update from Meeting
                </Button>
              )}
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="default">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create with AI
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Interactive CPM Schedule Creator</DialogTitle>
                  </DialogHeader>
                  <InteractiveScheduleCreator 
                    projectId={projectId}
                    onScheduleCreated={(scheduleId) => {
                      setShowCreateDialog(false);
                      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "schedules"] });
                      setSelectedSchedule(scheduleId);
                    }}
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Schedule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload Schedule File</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="schedule-type">Schedule Type</Label>
                      <Select value={uploadType} onValueChange={(v) => setUploadType(v as any)}>
                        <SelectTrigger id="schedule-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CPM">CPM Schedule</SelectItem>
                          <SelectItem value="3_WEEK_LOOKAHEAD">3-Week Lookahead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="schedule-file">Schedule File</Label>
                      <input
                        id="schedule-file"
                        type="file"
                        accept=".csv,.txt,.pdf"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-md file:border-0
                          file:text-sm file:font-semibold
                          file:bg-brand-primary file:text-white
                          hover:file:bg-brand-secondary"
                      />
                    </div>
                    <Button 
                      onClick={handleScheduleUpload}
                      disabled={!fileContent || uploadScheduleMutation.isPending}
                      className="w-full"
                    >
                      {uploadScheduleMutation.isPending ? "Processing..." : "Upload & Process"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cpm">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cpm">
                CPM Schedules ({cpmSchedules.length})
              </TabsTrigger>
              <TabsTrigger value="lookahead">
                3-Week Lookaheads ({lookaheadSchedules.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="cpm" className="space-y-4">
              {cpmSchedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No CPM schedules uploaded yet</p>
                  <p className="text-sm mt-1">Upload your project CPM schedule to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cpmSchedules.map((schedule) => (
                    <Card key={schedule.id} className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedSchedule(schedule.id)}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Version {schedule.version}</div>
                            <div className="text-sm text-gray-500">
                              Data Date: {schedule.dataDate} | {schedule.startDate} to {schedule.finishDate}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">CPM</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                generateLookaheadMutation.mutate(schedule.id);
                              }}
                              disabled={generateLookaheadMutation.isPending}
                            >
                              Generate Lookahead
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="lookahead" className="space-y-4">
              {lookaheadSchedules.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No 3-week lookaheads created yet</p>
                  <p className="text-sm mt-1">Generate from a CPM schedule or upload directly</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lookaheadSchedules.map((schedule) => (
                    <Card key={schedule.id} className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedSchedule(schedule.id)}>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {schedule.startDate} to {schedule.finishDate}
                            </div>
                            <div className="text-sm text-gray-500">
                              Created: {new Date(schedule.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge variant="outline">3-Week</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Activities View */}
      {currentSchedule && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Schedule Activities - {currentSchedule.scheduleType === "CPM" ? "CPM" : "3-Week Lookahead"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="text-center py-8">Loading activities...</div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p>No activities found in this schedule</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Finish</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.slice(0, 10).map((activity) => (
                      <tr key={activity.id}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {activity.activityId}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {activity.activityName}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {activity.startDate}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {activity.finishDate}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500">
                          {activity.remainingDuration}d
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={
                            activity.status === "Completed" ? "default" :
                            activity.status === "In Progress" ? "secondary" : "outline"
                          }>
                            {activity.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {activities.length > 10 && (
                  <div className="text-center py-2 text-sm text-gray-500">
                    Showing 10 of {activities.length} activities
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}