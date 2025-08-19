import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActivitySchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Activity, Wbs, Calendar, Relationship } from "@shared/schema";
import type { z } from "zod";
import { AlertTriangle, Calendar as CalendarIcon, Target, Users, Info, Plus, Code2 } from "lucide-react";

const activityTypes = [
  { value: "Task", label: "Task", description: "Standard work activity with duration", icon: Target },
  { value: "StartMilestone", label: "Start Milestone", description: "Zero-duration start event", icon: Target },
  { value: "FinishMilestone", label: "Finish Milestone", description: "Zero-duration finish event", icon: Target },
  { value: "LOE", label: "Level of Effort", description: "Ongoing effort activity", icon: Users },
  { value: "Hammock", label: "Hammock", description: "Activity spanning between other tasks", icon: Users },
  { value: "WBSSummary", label: "WBS Summary", description: "Summary of subordinate activities", icon: Users }
];

type InsertActivityForm = z.infer<typeof insertActivitySchema>;

interface ActivityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityId: string | null;
  projectId: string;
  wbs: Wbs[];
  calendars: Calendar[];
  activities: Activity[];
}

export default function ActivityDialog({ 
  open, 
  onOpenChange, 
  activityId, 
  projectId, 
  wbs, 
  calendars, 
  activities 
}: ActivityDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  const [activityCodes, setActivityCodes] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Record<string, string>>({});

  // Fetch existing activity data if editing
  const { data: activity, isLoading } = useQuery<Activity>({
    queryKey: ["/api/activities", activityId],
    enabled: !!activityId && open,
  });

  // Get relationships for this activity
  const { data: relationships = [] } = useQuery<Relationship[]>({
    queryKey: ["/api/activities", activityId, "relationships"],
    enabled: !!activityId && open,
  });

  const form = useForm<InsertActivityForm>({
    resolver: zodResolver(insertActivitySchema.omit({ projectId: true })),
    defaultValues: {
      activityId: "",
      name: "",
      type: "Task",
      originalDuration: 1,
      remainingDuration: null,
      status: "NotStarted",
      percentComplete: 0,
      responsibility: "",
      trade: "",
      constraintType: null,
      constraintDate: null,
      calendarId: null,
      wbsId: null,
      actualStart: null,
      actualFinish: null,
      notes: null,
      location: null
    }
  });

  // Update form when activity data is loaded
  useEffect(() => {
    if (activity) {
      form.reset({
        activityId: activity.activityId,
        name: activity.name,
        type: activity.type,
        originalDuration: activity.originalDuration,
        remainingDuration: activity.remainingDuration,
        status: activity.status,
        percentComplete: activity.percentComplete || 0,
        responsibility: activity.responsibility,
        trade: activity.trade,
        constraintType: activity.constraintType,
        constraintDate: activity.constraintDate,
        calendarId: activity.calendarId,
        wbsId: activity.wbsId,
        actualStart: activity.actualStart,
        actualFinish: activity.actualFinish,
        notes: activity.notes,
        location: activity.location
      });
    } else if (open && !activityId) {
      // Generate next activity ID for new activities
      const maxActivityNum = activities.reduce((max, act) => {
        const match = act.activityId.match(/^A(\d+)$/);
        return match ? Math.max(max, parseInt(match[1])) : max;
      }, 0);
      
      form.reset({
        activityId: `A${String(maxActivityNum + 1).padStart(3, '0')}`,
        name: "",
        type: "Task",
        originalDuration: 1,
        remainingDuration: null,
        status: "NotStarted",
        percentComplete: 0,
        responsibility: "",
        trade: "",
        constraintType: null,
        constraintDate: null,
        calendarId: null,
        wbsId: null,
        actualStart: null,
        actualFinish: null,
        notes: null,
        location: null
      });
    }
  }, [activity, open, activityId, activities, form]);

  const createActivityMutation = useMutation({
    mutationFn: async (data: InsertActivityForm) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/activities`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "relationships"] });
      onOpenChange(false);
      toast({
        title: "Activity Created",
        description: "The activity has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateActivityMutation = useMutation({
    mutationFn: async (data: InsertActivityForm) => {
      const response = await apiRequest("PUT", `/api/activities/${activityId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activities", activityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "relationships"] });
      onOpenChange(false);
      toast({
        title: "Activity Updated",
        description: "The activity has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/activities/${activityId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "relationships"] });
      onOpenChange(false);
      toast({
        title: "Activity Deleted",
        description: "The activity has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertActivityForm) => {
    if (activityId) {
      updateActivityMutation.mutate(data);
    } else {
      createActivityMutation.mutate(data);
    }
  };

  const handleDelete = () => {
    if (activityId && confirm("Are you sure you want to delete this activity?")) {
      deleteActivityMutation.mutate();
    }
  };

  const constraintTypes = [
    { value: "SNET", label: "Start No Earlier Than" },
    { value: "SNLT", label: "Start No Later Than" },
    { value: "FNET", label: "Finish No Earlier Than" },
    { value: "FNLT", label: "Finish No Later Than" },
    { value: "MSO", label: "Must Start On" },
    { value: "MFO", label: "Must Finish On" }
  ];

  // Use the activityTypes defined at module level

  const statuses = [
    { value: "NotStarted", label: "Not Started" },
    { value: "InProgress", label: "In Progress" },
    { value: "Completed", label: "Completed" }
  ];

  const riskLevels = [
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" },
    { value: "Critical", label: "Critical" }
  ];

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{activityId ? "Edit Activity" : "New Activity"}</span>
            {activity?.isCritical && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Critical Path
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="constraints">Constraints</TabsTrigger>
                <TabsTrigger value="codes">Activity Codes</TabsTrigger>
                <TabsTrigger value="custom">Custom Fields</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
                <TabsTrigger value="progress">Progress</TabsTrigger>
              </TabsList>

              <div className="flex-1 overflow-y-auto">
                <TabsContent value="general" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="activityId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activity ID</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-activity-id" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activity Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-activity-type">
                                <SelectValue placeholder="Select activity type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {activityTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex items-center space-x-2">
                                    <type.icon className="w-4 h-4" />
                                    <div className="flex flex-col">
                                      <span>{type.label}</span>
                                      <span className="text-xs text-gray-500">{type.description}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activity Name</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-activity-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="wbsId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WBS</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-wbs">
                                <SelectValue placeholder="Select WBS" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No WBS</SelectItem>
                              {wbs.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                  {w.code} - {w.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="calendarId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Calendar</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-calendar">
                                <SelectValue placeholder="Select calendar" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="default">Default Calendar</SelectItem>
                              {calendars.map((cal) => (
                                <SelectItem key={cal.id} value={cal.id}>
                                  <CalendarIcon className="w-4 h-4 mr-2" />
                                  {cal.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="responsibility"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsibility</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-responsibility" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="trade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trade</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid="input-trade" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="riskLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risk Level</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || "Low"}>
                            <FormControl>
                              <SelectTrigger data-testid="select-risk-level">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {riskLevels.map((risk) => (
                                <SelectItem key={risk.value} value={risk.value}>
                                  {risk.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value || ""} 
                            rows={3}
                            data-testid="textarea-notes"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="originalDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Original Duration (days)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0"
                              onChange={e => field.onChange(Number(e.target.value))}
                              data-testid="input-original-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="remainingDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remaining Duration (days)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0"
                              value={field.value || ""}
                              onChange={e => field.onChange(e.target.value ? Number(e.target.value) : null)}
                              data-testid="input-remaining-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="predecessors"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Predecessors</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            value={field.value || ""} 
                            placeholder="Enter predecessors (e.g., A001, A002SS+3, A003FF-1)"
                            rows={3}
                            data-testid="textarea-predecessors"
                          />
                        </FormControl>
                        <div className="text-sm text-gray-500">
                          Format: ActivityID[RelationType][+/-Days]. 
                          Relation types: FS (default), SS, FF, SF. 
                          Example: A001, A002SS+3, A003FF-1
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {activity && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div>
                        <Label className="text-sm font-medium">Early Start</Label>
                        <div className="text-sm">
                          {activity.earlyStart ? new Date(activity.earlyStart).toLocaleDateString() : 'Not calculated'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Early Finish</Label>
                        <div className="text-sm">
                          {activity.earlyFinish ? new Date(activity.earlyFinish).toLocaleDateString() : 'Not calculated'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Late Start</Label>
                        <div className="text-sm">
                          {activity.lateStart ? new Date(activity.lateStart).toLocaleDateString() : 'Not calculated'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Late Finish</Label>
                        <div className="text-sm">
                          {activity.lateFinish ? new Date(activity.lateFinish).toLocaleDateString() : 'Not calculated'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Total Float</Label>
                        <div className={`text-sm font-medium ${
                          activity.isCritical ? 'text-red-600' : 
                          (activity.totalFloat || 0) <= 5 ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {activity.totalFloat !== null ? `${activity.totalFloat} days` : 'Not calculated'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Free Float</Label>
                        <div className="text-sm">
                          {activity.freeFloat !== null ? `${activity.freeFloat} days` : 'Not calculated'}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="constraints" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="constraintType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Constraint Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-constraint-type">
                                <SelectValue placeholder="Select constraint type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">No Constraint</SelectItem>
                              {constraintTypes.map((constraint) => (
                                <SelectItem key={constraint.value} value={constraint.value}>
                                  <Target className="w-4 h-4 mr-2" />
                                  {constraint.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="constraintDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Constraint Date</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                              value={field.value || ""} 
                              data-testid="input-constraint-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name="criticalMilestone"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value || false}
                                onChange={field.onChange}
                                data-testid="checkbox-critical-milestone"
                              />
                            </FormControl>
                            <FormLabel>Critical Milestone</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <FormField
                        control={form.control}
                        name="weatherSensitive"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value || false}
                                onChange={field.onChange}
                                data-testid="checkbox-weather-sensitive"
                              />
                            </FormControl>
                            <FormLabel>Weather Sensitive</FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="workArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Work Area</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid="input-work-area" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="resources" className="space-y-4 mt-4">
                  <div className="text-center text-gray-500 py-8">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Resource assignments will be managed here</p>
                    <p className="text-sm">Feature coming soon</p>
                  </div>
                </TabsContent>

                <TabsContent value="progress" className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-status">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {statuses.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="percentComplete"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percent Complete</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              min="0" 
                              max="100"
                              value={field.value || 0}
                              onChange={e => field.onChange(Number(e.target.value))}
                              data-testid="input-percent-complete"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="actualStart"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Start</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                              value={field.value || ""} 
                              data-testid="input-actual-start"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="actualFinish"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Actual Finish</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="date" 
                              value={field.value || ""} 
                              data-testid="input-actual-finish"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="codes" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Activity Codes</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const key = prompt("Enter activity code name:");
                          const value = prompt("Enter activity code value:");
                          if (key && value) {
                            setActivityCodes({...activityCodes, [key]: value});
                          }
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Code
                      </Button>
                    </div>
                    
                    <div className="grid gap-4">
                      {Object.entries(activityCodes).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Input
                            value={key}
                            onChange={(e) => {
                              const newCodes = {...activityCodes};
                              delete newCodes[key];
                              newCodes[e.target.value] = value;
                              setActivityCodes(newCodes);
                            }}
                            placeholder="Code name"
                            className="flex-1"
                          />
                          <Input
                            value={value}
                            onChange={(e) => setActivityCodes({...activityCodes, [key]: e.target.value})}
                            placeholder="Code value"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newCodes = {...activityCodes};
                              delete newCodes[key];
                              setActivityCodes(newCodes);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      
                      {Object.keys(activityCodes).length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                          <Code2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No activity codes defined</p>
                          <p className="text-sm">Add codes for filtering and grouping activities</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="custom" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Custom Fields</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const key = prompt("Enter field name:");
                          const value = prompt("Enter field value:");
                          if (key && value) {
                            setCustomFields({...customFields, [key]: value});
                          }
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Field
                      </Button>
                    </div>
                    
                    <div className="grid gap-4">
                      {Object.entries(customFields).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Input
                            value={key}
                            onChange={(e) => {
                              const newFields = {...customFields};
                              delete newFields[key];
                              newFields[e.target.value] = value;
                              setCustomFields(newFields);
                            }}
                            placeholder="Field name"
                            className="flex-1"
                          />
                          <Input
                            value={value}
                            onChange={(e) => setCustomFields({...customFields, [key]: e.target.value})}
                            placeholder="Field value"
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newFields = {...customFields};
                              delete newFields[key];
                              setCustomFields(newFields);
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                      
                      {Object.keys(customFields).length === 0 && (
                        <div className="text-center text-gray-500 py-4">
                          <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No custom fields defined</p>
                          <p className="text-sm">Add custom fields for additional activity data</p>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>

              <div className="flex justify-between pt-4 border-t">
                <div>
                  {activityId && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={deleteActivityMutation.isPending}
                      data-testid="button-delete-activity"
                    >
                      {deleteActivityMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </div>
                <div className="space-x-2">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createActivityMutation.isPending || updateActivityMutation.isPending}
                    data-testid="button-save-activity"
                  >
                    {createActivityMutation.isPending || updateActivityMutation.isPending
                      ? "Saving..." 
                      : activityId ? "Update" : "Create"
                    }
                  </Button>
                </div>
              </div>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}