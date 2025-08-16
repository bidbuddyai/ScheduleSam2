import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, GitBranch, Calendar, Clock, AlertTriangle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface Activity {
  id: string;
  activityId: string;
  activityName: string;
  duration: number;
  earlyStart?: number;
  earlyFinish?: number;
  lateStart?: number;
  lateFinish?: number;
  totalFloat?: number;
  freeFloat?: number;
  isCritical?: boolean;
  predecessors: string[];
  successors: string[];
  status: 'Not Started' | 'In Progress' | 'Completed';
  percentComplete: number;
  startDate?: string;
  finishDate?: string;
  resources?: string[];
  wbs?: string;
}

interface ScheduleEditorProps {
  activities: Activity[];
  onActivitiesChange: (activities: Activity[]) => void;
  projectStartDate: string;
  onSave?: () => void;
}

export default function ScheduleEditor({ 
  activities: initialActivities, 
  onActivitiesChange,
  projectStartDate,
  onSave
}: ScheduleEditorProps) {
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [selectedView, setSelectedView] = useState<'table' | 'gantt' | 'network'>('table');
  
  // Form state for activity editing
  const [formData, setFormData] = useState({
    activityId: '',
    activityName: '',
    duration: 1,
    predecessors: '',
    status: 'Not Started' as Activity['status'],
    percentComplete: 0,
    wbs: '',
    resources: ''
  });

  // Calculate CPM network
  const calculateCPM = (acts: Activity[]): Activity[] => {
    const activityMap = new Map(acts.map(a => [a.activityId, { ...a }]));
    const startDate = new Date(projectStartDate);
    
    // Forward pass - calculate early start/finish
    const calculateEarlyDates = (activity: Activity, visited = new Set<string>()): void => {
      if (visited.has(activity.activityId)) return;
      visited.add(activity.activityId);
      
      let maxEarlyFinish = 0;
      
      if (activity.predecessors.length === 0) {
        activity.earlyStart = 0;
      } else {
        for (const predId of activity.predecessors) {
          const pred = activityMap.get(predId);
          if (pred) {
            if (!visited.has(predId)) {
              calculateEarlyDates(pred, visited);
            }
            maxEarlyFinish = Math.max(maxEarlyFinish, pred.earlyFinish || 0);
          }
        }
        activity.earlyStart = maxEarlyFinish;
      }
      
      activity.earlyFinish = activity.earlyStart + activity.duration;
      
      // Calculate actual dates
      const actStartDate = new Date(startDate);
      actStartDate.setDate(actStartDate.getDate() + activity.earlyStart);
      activity.startDate = actStartDate.toISOString().split('T')[0];
      
      const actFinishDate = new Date(startDate);
      actFinishDate.setDate(actFinishDate.getDate() + activity.earlyFinish - 1);
      activity.finishDate = actFinishDate.toISOString().split('T')[0];
    };
    
    // Calculate early dates for all activities
    activityMap.forEach(activity => {
      calculateEarlyDates(activity);
    });
    
    // Find project finish
    let projectFinish = 0;
    activityMap.forEach(activity => {
      if (activity.successors.length === 0) {
        projectFinish = Math.max(projectFinish, activity.earlyFinish || 0);
      }
    });
    
    // Backward pass - calculate late start/finish
    const calculateLateDates = (activity: Activity, visited = new Set<string>()): void => {
      if (visited.has(activity.activityId)) return;
      visited.add(activity.activityId);
      
      if (activity.successors.length === 0) {
        activity.lateFinish = projectFinish;
      } else {
        let minLateStart = Infinity;
        for (const succId of activity.successors) {
          const succ = activityMap.get(succId);
          if (succ) {
            if (!visited.has(succId)) {
              calculateLateDates(succ, visited);
            }
            minLateStart = Math.min(minLateStart, succ.lateStart || Infinity);
          }
        }
        activity.lateFinish = minLateStart;
      }
      
      activity.lateStart = activity.lateFinish - activity.duration;
      activity.totalFloat = activity.lateStart - (activity.earlyStart || 0);
      activity.isCritical = activity.totalFloat === 0;
    };
    
    // Calculate late dates for all activities
    activityMap.forEach(activity => {
      calculateLateDates(activity);
    });
    
    return Array.from(activityMap.values());
  };

  // Update activities with CPM calculations
  useEffect(() => {
    if (activities.length > 0) {
      const calculatedActivities = calculateCPM(activities);
      setActivities(calculatedActivities);
      onActivitiesChange(calculatedActivities);
    }
  }, [initialActivities, projectStartDate]);

  const handleAddActivity = () => {
    setEditingActivity(null);
    setFormData({
      activityId: `A${(activities.length + 1).toString().padStart(3, '0')}`,
      activityName: '',
      duration: 1,
      predecessors: '',
      status: 'Not Started',
      percentComplete: 0,
      wbs: '',
      resources: ''
    });
    setShowActivityDialog(true);
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      activityId: activity.activityId,
      activityName: activity.activityName,
      duration: activity.duration,
      predecessors: activity.predecessors.join(', '),
      status: activity.status,
      percentComplete: activity.percentComplete,
      wbs: activity.wbs || '',
      resources: activity.resources?.join(', ') || ''
    });
    setShowActivityDialog(true);
  };

  const handleSaveActivity = () => {
    const predecessorList = formData.predecessors
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    const resourceList = formData.resources
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0);
    
    const newActivity: Activity = {
      id: editingActivity?.id || crypto.randomUUID(),
      activityId: formData.activityId,
      activityName: formData.activityName,
      duration: formData.duration,
      predecessors: predecessorList,
      successors: [],
      status: formData.status,
      percentComplete: formData.percentComplete,
      wbs: formData.wbs,
      resources: resourceList
    };
    
    let updatedActivities: Activity[];
    
    if (editingActivity) {
      updatedActivities = activities.map(a => 
        a.id === editingActivity.id ? newActivity : a
      );
    } else {
      updatedActivities = [...activities, newActivity];
    }
    
    // Update successors based on predecessors
    updatedActivities = updatedActivities.map(activity => {
      const successors = updatedActivities
        .filter(a => a.predecessors.includes(activity.activityId))
        .map(a => a.activityId);
      return { ...activity, successors };
    });
    
    const calculatedActivities = calculateCPM(updatedActivities);
    setActivities(calculatedActivities);
    onActivitiesChange(calculatedActivities);
    setShowActivityDialog(false);
    
    toast({
      title: editingActivity ? "Activity updated" : "Activity added",
      description: `${formData.activityName} has been ${editingActivity ? 'updated' : 'added'} to the schedule.`,
    });
  };

  const handleDeleteActivity = (activityId: string) => {
    const updatedActivities = activities.filter(a => a.id !== activityId);
    const calculatedActivities = calculateCPM(updatedActivities);
    setActivities(calculatedActivities);
    onActivitiesChange(calculatedActivities);
    
    toast({
      title: "Activity deleted",
      description: "The activity has been removed from the schedule.",
    });
  };

  const criticalPath = useMemo(() => {
    return activities.filter(a => a.isCritical);
  }, [activities]);

  const projectDuration = useMemo(() => {
    return Math.max(...activities.map(a => a.earlyFinish || 0), 0);
  }, [activities]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule Editor</CardTitle>
            <div className="flex gap-2">
              <Button onClick={handleAddActivity} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
              {onSave && (
                <Button onClick={onSave} variant="default" size="sm">
                  <Save className="h-4 w-4 mr-2" />
                  Save Schedule
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Schedule Summary */}
          <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm text-gray-600">Total Activities</Label>
              <p className="text-2xl font-bold">{activities.length}</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Project Duration</Label>
              <p className="text-2xl font-bold">{projectDuration} days</p>
            </div>
            <div>
              <Label className="text-sm text-gray-600">Critical Activities</Label>
              <p className="text-2xl font-bold text-red-600">{criticalPath.length}</p>
            </div>
          </div>

          <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="table">Table View</TabsTrigger>
              <TabsTrigger value="gantt">Gantt Chart</TabsTrigger>
              <TabsTrigger value="network">Network Diagram</TabsTrigger>
            </TabsList>

            <TabsContent value="table">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Finish</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Float</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Predecessors</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {activities.map((activity) => (
                      <tr key={activity.id} className={activity.isCritical ? 'bg-red-50' : ''}>
                        <td className="px-3 py-2 text-sm font-medium">
                          {activity.activityId}
                          {activity.isCritical && (
                            <AlertTriangle className="inline-block h-3 w-3 ml-1 text-red-500" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-sm">{activity.activityName}</td>
                        <td className="px-3 py-2 text-sm">{activity.duration}d</td>
                        <td className="px-3 py-2 text-sm">{activity.startDate}</td>
                        <td className="px-3 py-2 text-sm">{activity.finishDate}</td>
                        <td className="px-3 py-2 text-sm">
                          <Badge variant={activity.totalFloat === 0 ? 'destructive' : 'outline'}>
                            {activity.totalFloat}d
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-sm">{activity.predecessors.join(', ') || '-'}</td>
                        <td className="px-3 py-2">
                          <Badge variant={
                            activity.status === 'Completed' ? 'default' :
                            activity.status === 'In Progress' ? 'secondary' : 'outline'
                          }>
                            {activity.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditActivity(activity)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteActivity(activity.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>

            <TabsContent value="gantt">
              <GanttChart activities={activities} projectStartDate={projectStartDate} />
            </TabsContent>

            <TabsContent value="network">
              <NetworkDiagram activities={activities} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? 'Edit Activity' : 'Add New Activity'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="activityId">Activity ID</Label>
                <Input
                  id="activityId"
                  value={formData.activityId}
                  onChange={(e) => setFormData({ ...formData, activityId: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="wbs">WBS Code</Label>
                <Input
                  id="wbs"
                  value={formData.wbs}
                  onChange={(e) => setFormData({ ...formData, wbs: e.target.value })}
                  placeholder="1.2.3"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="activityName">Activity Name</Label>
              <Input
                id="activityName"
                value={formData.activityName}
                onChange={(e) => setFormData({ ...formData, activityName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (days)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="predecessors">Predecessors</Label>
                <Input
                  id="predecessors"
                  value={formData.predecessors}
                  onChange={(e) => setFormData({ ...formData, predecessors: e.target.value })}
                  placeholder="A001, A002"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(v) => setFormData({ ...formData, status: v as Activity['status'] })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="percentComplete">% Complete</Label>
                <Input
                  id="percentComplete"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.percentComplete}
                  onChange={(e) => setFormData({ ...formData, percentComplete: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="resources">Resources</Label>
              <Input
                id="resources"
                value={formData.resources}
                onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                placeholder="John Doe, Excavator, Crane"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowActivityDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveActivity}>
                {editingActivity ? 'Update' : 'Add'} Activity
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Gantt Chart Component
function GanttChart({ activities, projectStartDate }: { activities: Activity[], projectStartDate: string }) {
  const startDate = new Date(projectStartDate);
  const endDate = new Date(Math.max(...activities.map(a => new Date(a.finishDate || projectStartDate).getTime())));
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[800px] p-4 bg-gray-50 rounded-lg">
        {/* Timeline Header */}
        <div className="flex border-b-2 border-gray-300 pb-2 mb-2">
          <div className="w-48 font-medium">Activity</div>
          <div className="flex-1 flex">
            {Array.from({ length: Math.min(totalDays, 30) }, (_, i) => {
              const date = new Date(startDate);
              date.setDate(date.getDate() + i);
              return (
                <div key={i} className="flex-1 text-xs text-center border-l border-gray-200">
                  {date.getDate()}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Activities */}
        {activities.map((activity) => {
          const actStart = new Date(activity.startDate || projectStartDate);
          const actFinish = new Date(activity.finishDate || projectStartDate);
          const startOffset = Math.ceil((actStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          const duration = Math.ceil((actFinish.getTime() - actStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          
          return (
            <div key={activity.id} className="flex items-center h-10 border-b border-gray-200">
              <div className="w-48 text-sm truncate pr-2">
                {activity.activityId}: {activity.activityName}
              </div>
              <div className="flex-1 relative">
                <div 
                  className={`absolute h-6 rounded ${
                    activity.isCritical ? 'bg-red-500' : 'bg-blue-500'
                  } opacity-80`}
                  style={{
                    left: `${(startOffset / totalDays) * 100}%`,
                    width: `${(duration / totalDays) * 100}%`
                  }}
                >
                  {activity.percentComplete > 0 && (
                    <div 
                      className="absolute top-0 left-0 h-full bg-green-500 rounded"
                      style={{ width: `${activity.percentComplete}%` }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Network Diagram Component
function NetworkDiagram({ activities }: { activities: Activity[] }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg min-h-[400px]">
      <div className="grid grid-cols-4 gap-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`p-3 rounded-lg border-2 ${
              activity.isCritical 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-300 bg-white'
            }`}
          >
            <div className="text-xs font-medium">{activity.activityId}</div>
            <div className="text-sm font-semibold truncate">{activity.activityName}</div>
            <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
              <div>ES: {activity.earlyStart}</div>
              <div>EF: {activity.earlyFinish}</div>
              <div>LS: {activity.lateStart}</div>
              <div>LF: {activity.lateFinish}</div>
            </div>
            <div className="mt-1 text-xs">
              Duration: {activity.duration}d | Float: {activity.totalFloat}d
            </div>
            {activity.predecessors.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                <GitBranch className="inline h-3 w-3" /> {activity.predecessors.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}