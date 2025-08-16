import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import type { Activity, Relationship, Wbs } from "@shared/schema";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Circle, 
  PlayCircle,
  Target,
  Calendar,
  Filter,
  Eye
} from "lucide-react";

interface ScheduleGridProps {
  activities: Activity[];
  relationships: Relationship[];
  wbs: Wbs[];
  onActivitySelect: (activityId: string) => void;
  onNewActivity: () => void;
}

export default function ScheduleGrid({ 
  activities, 
  relationships, 
  wbs, 
  onActivitySelect, 
  onNewActivity 
}: ScheduleGridProps) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'critical' | 'in-progress' | 'constrained'>('all');
  const [sortBy, setSortBy] = useState<'earlyStart' | 'activityId' | 'totalFloat' | 'name'>('earlyStart');
  const [showColumns, setShowColumns] = useState({
    activityId: true,
    name: true,
    type: true,
    duration: true,
    earlyStart: true,
    earlyFinish: true,
    totalFloat: true,
    status: true,
    predecessors: true,
    constraints: true,
    responsibility: true,
    trade: true
  });

  // Create a map of WBS items for quick lookup
  const wbsMap = new Map(wbs.map(w => [w.id, w]));

  // Create a map of relationships for predecessor/successor lookup
  const getPredecessors = (activityId: string) => {
    return relationships
      .filter(r => r.successorId === activityId)
      .map(r => {
        const pred = activities.find(a => a.id === r.predecessorId);
        if (!pred) return null;
        
        let relationText = `${pred.activityId}`;
        if (r.type !== 'FS') {
          relationText += r.type;
        }
        if (r.lag && r.lag !== 0) {
          relationText += r.lag > 0 ? `+${r.lag}` : `${r.lag}`;
        }
        return relationText;
      })
      .filter(Boolean)
      .join(', ');
  };

  const getSuccessors = (activityId: string) => {
    return relationships
      .filter(r => r.predecessorId === activityId)
      .map(r => {
        const succ = activities.find(a => a.id === r.successorId);
        return succ?.activityId || '';
      })
      .filter(Boolean)
      .join(', ');
  };

  // Filter activities based on selected filter
  const filteredActivities = activities.filter(activity => {
    switch (filter) {
      case 'critical':
        return activity.isCritical;
      case 'in-progress':
        return activity.status === 'InProgress';
      case 'constrained':
        return activity.constraintType && activity.constraintDate;
      default:
        return true;
    }
  });

  // Sort activities
  const sortedActivities = [...filteredActivities].sort((a, b) => {
    switch (sortBy) {
      case 'activityId':
        return a.activityId.localeCompare(b.activityId);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'totalFloat':
        return (a.totalFloat || 0) - (b.totalFloat || 0);
      case 'earlyStart':
      default:
        if (!a.earlyStart && !b.earlyStart) return 0;
        if (!a.earlyStart) return 1;
        if (!b.earlyStart) return -1;
        return new Date(a.earlyStart).getTime() - new Date(b.earlyStart).getTime();
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'InProgress':
        return <PlayCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConstraintBadge = (activity: Activity) => {
    if (!activity.constraintType || !activity.constraintDate) return null;
    
    const constraintMap = {
      'SNET': 'Start No Earlier',
      'SNLT': 'Start No Later',
      'FNET': 'Finish No Earlier',
      'FNLT': 'Finish No Later',
      'MSO': 'Must Start On',
      'MFO': 'Must Finish On'
    };

    return (
      <Badge variant="outline" className="text-xs">
        <Target className="w-3 h-3 mr-1" />
        {constraintMap[activity.constraintType as keyof typeof constraintMap] || activity.constraintType}
      </Badge>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: '2-digit'
    });
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return '-';
    return `${duration}d`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <span>Schedule Activities</span>
            <Badge variant="secondary">
              {sortedActivities.length} of {activities.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="critical">Critical Path</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="constrained">Constrained</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earlyStart">Early Start</SelectItem>
                <SelectItem value="activityId">Activity ID</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="totalFloat">Float</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={onNewActivity} size="sm" data-testid="button-new-activity-grid">
              <Circle className="w-4 h-4 mr-2" />
              New Activity
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                {showColumns.activityId && (
                  <TableHead className="w-24">Activity ID</TableHead>
                )}
                {showColumns.name && (
                  <TableHead className="min-w-48">Activity Name</TableHead>
                )}
                {showColumns.type && (
                  <TableHead className="w-20">Type</TableHead>
                )}
                {showColumns.duration && (
                  <TableHead className="w-20">Duration</TableHead>
                )}
                {showColumns.earlyStart && (
                  <TableHead className="w-24">Early Start</TableHead>
                )}
                {showColumns.earlyFinish && (
                  <TableHead className="w-24">Early Finish</TableHead>
                )}
                {showColumns.totalFloat && (
                  <TableHead className="w-20">Float</TableHead>
                )}
                {showColumns.status && (
                  <TableHead className="w-24">Status</TableHead>
                )}
                {showColumns.predecessors && (
                  <TableHead className="w-32">Predecessors</TableHead>
                )}
                {showColumns.constraints && (
                  <TableHead className="w-32">Constraints</TableHead>
                )}
                {showColumns.responsibility && (
                  <TableHead className="w-24">Responsibility</TableHead>
                )}
                {showColumns.trade && (
                  <TableHead className="w-24">Trade</TableHead>
                )}
                <TableHead className="w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedActivities.map((activity) => (
                <TableRow 
                  key={activity.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${
                    activity.isCritical ? 'border-l-4 border-l-red-500' : ''
                  }`}
                  onClick={() => onActivitySelect(activity.id)}
                  data-testid={`row-activity-${activity.activityId}`}
                >
                  {showColumns.activityId && (
                    <TableCell className="font-medium">
                      {activity.activityId}
                    </TableCell>
                  )}
                  {showColumns.name && (
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{activity.name}</span>
                        {activity.wbsId && wbsMap.has(activity.wbsId) && (
                          <span className="text-xs text-gray-500">
                            {wbsMap.get(activity.wbsId)?.code} - {wbsMap.get(activity.wbsId)?.name}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {showColumns.type && (
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {activity.type}
                      </Badge>
                    </TableCell>
                  )}
                  {showColumns.duration && (
                    <TableCell>{formatDuration(activity.originalDuration)}</TableCell>
                  )}
                  {showColumns.earlyStart && (
                    <TableCell>{formatDate(activity.earlyStart)}</TableCell>
                  )}
                  {showColumns.earlyFinish && (
                    <TableCell>{formatDate(activity.earlyFinish)}</TableCell>
                  )}
                  {showColumns.totalFloat && (
                    <TableCell>
                      <div className={`font-medium ${
                        activity.isCritical ? 'text-red-600' : 
                        (activity.totalFloat || 0) <= 5 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {activity.totalFloat !== null ? `${activity.totalFloat}d` : '-'}
                      </div>
                    </TableCell>
                  )}
                  {showColumns.status && (
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(activity.status)}
                        <span className="text-sm">{activity.status}</span>
                      </div>
                    </TableCell>
                  )}
                  {showColumns.predecessors && (
                    <TableCell>
                      <span className="text-xs text-gray-600">
                        {getPredecessors(activity.id) || '-'}
                      </span>
                    </TableCell>
                  )}
                  {showColumns.constraints && (
                    <TableCell>
                      {getConstraintBadge(activity)}
                    </TableCell>
                  )}
                  {showColumns.responsibility && (
                    <TableCell className="text-sm">
                      {activity.responsibility || '-'}
                    </TableCell>
                  )}
                  {showColumns.trade && (
                    <TableCell className="text-sm">
                      {activity.trade || '-'}
                    </TableCell>
                  )}
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onActivitySelect(activity.id);
                      }}
                      data-testid={`button-view-activity-${activity.activityId}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {sortedActivities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Circle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-lg font-medium">No activities found</p>
            <p className="text-sm">Create your first activity to get started</p>
            <Button onClick={onNewActivity} className="mt-4">
              <Circle className="w-4 h-4 mr-2" />
              Create Activity
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}