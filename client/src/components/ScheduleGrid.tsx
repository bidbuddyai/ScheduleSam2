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
  Eye,
  ChevronRight,
  ChevronDown,
  Indent,
  Outdent,
  Code2,
  Plus,
  Search
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
    trade: true,
    wbs: true,
    activityCodes: false,
    customFields: false
  });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedActivityCodes, setSelectedActivityCodes] = useState<string[]>([]);
  const [expandedWBS, setExpandedWBS] = useState<Set<string>>(new Set());
  
  // Extract unique activity codes and custom field keys for filtering
  const availableActivityCodes = Array.from(
    new Set(
      activities
        .flatMap(a => a.activityCodes ? Object.keys(a.activityCodes as any) : [])
    )
  );
  
  const availableCustomFields = Array.from(
    new Set(
      activities
        .flatMap(a => a.customFields ? Object.keys(a.customFields as any) : [])
    )
  );

  // Create a map of WBS items for quick lookup
  const wbsMap = new Map(wbs.map(w => [w.id, w]));

  // Create hierarchical activity display with WBS grouping
  const getActivityDisplayLevel = (activity: Activity): number => {
    if (!activity.wbsId) return 0;
    const wbsItem = wbsMap.get(activity.wbsId);
    return wbsItem ? wbsItem.level : 0;
  };
  
  const toggleWBSExpansion = (wbsId: string) => {
    const newExpanded = new Set(expandedWBS);
    if (newExpanded.has(wbsId)) {
      newExpanded.delete(wbsId);
    } else {
      newExpanded.add(wbsId);
    }
    setExpandedWBS(newExpanded);
  };
  
  // Filter and sort activities
  const filteredActivities = activities.filter(activity => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!activity.name.toLowerCase().includes(searchLower) && 
          !activity.activityId.toLowerCase().includes(searchLower) &&
          !activity.responsibility?.toLowerCase().includes(searchLower) &&
          !activity.trade?.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Status/type filters
    if (filter === 'critical' && !activity.isCritical) return false;
    if (filter === 'in-progress' && activity.status !== 'InProgress') return false;
    if (filter === 'constrained' && !activity.constraintType) return false;
    
    // Activity codes filter
    if (selectedActivityCodes.length > 0) {
      const activityCodes = activity.activityCodes as any;
      if (!activityCodes || !selectedActivityCodes.some(code => code in activityCodes)) {
        return false;
      }
    }
    
    return true;
  });

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

  // Additional status/type filters are applied in the main filteredActivities above

  // Sort filtered activities
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
            <Button onClick={onNewActivity} size="sm" data-testid="button-new-activity-grid">
              <Plus className="w-4 h-4 mr-2" />
              New Activity
            </Button>
          </div>
        </div>
        
        {/* Enhanced Toolbar */}
        <div className="flex items-center justify-between space-x-4 mt-4">
          <div className="flex items-center space-x-2 flex-1">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
                data-testid="input-search-activities"
              />
            </div>
            
            {/* Filters */}
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-40" data-testid="select-activity-filter">
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
            
            {/* Activity Codes Filter */}
            {availableActivityCodes.length > 0 && (
              <Select value="" onValueChange={(code) => {
                if (code && !selectedActivityCodes.includes(code)) {
                  setSelectedActivityCodes([...selectedActivityCodes, code]);
                }
              }}>
                <SelectTrigger className="w-40" data-testid="select-activity-codes">
                  <Code2 className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Activity Codes" />
                </SelectTrigger>
                <SelectContent>
                  {availableActivityCodes.map(code => (
                    <SelectItem key={code} value={code}>{code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Selected Activity Codes */}
            {selectedActivityCodes.map(code => (
              <Badge key={code} variant="secondary" className="cursor-pointer"
                onClick={() => setSelectedActivityCodes(selectedActivityCodes.filter(c => c !== code))}>
                {code} ×
              </Badge>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32" data-testid="select-sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="earlyStart">Early Start</SelectItem>
                <SelectItem value="activityId">Activity ID</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="totalFloat">Float</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Column Visibility */}
            <Button variant="outline" size="sm" className="p-2">
              <Eye className="w-4 h-4" />
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
                {showColumns.wbs && (
                  <TableHead className="w-32">WBS</TableHead>
                )}
                {showColumns.activityCodes && (
                  <TableHead className="w-40">Activity Codes</TableHead>
                )}
                {showColumns.customFields && (
                  <TableHead className="w-40">Custom Fields</TableHead>
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
                      <div 
                        className="flex items-center"
                        style={{ paddingLeft: `${getActivityDisplayLevel(activity) * 16}px` }}
                      >
                        {/* WBS Expansion Toggle for WBS Summary activities */}
                        {activity.type === 'WBSSummary' && activity.wbsId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-1 h-6 w-6 mr-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleWBSExpansion(activity.wbsId!);
                            }}
                          >
                            {expandedWBS.has(activity.wbsId) ? 
                              <ChevronDown className="w-3 h-3" /> : 
                              <ChevronRight className="w-3 h-3" />
                            }
                          </Button>
                        )}
                        
                        {/* Activity Type Icon */}
                        <div className="mr-2">
                          {activity.type === 'StartMilestone' || activity.type === 'FinishMilestone' ? (
                            <Target className="w-4 h-4 text-blue-600" />
                          ) : activity.type === 'WBSSummary' ? (
                            <ChevronRight className="w-4 h-4 text-purple-600" />
                          ) : activity.type === 'LOE' ? (
                            <Calendar className="w-4 h-4 text-orange-600" />
                          ) : activity.type === 'Hammock' ? (
                            <Outdent className="w-4 h-4 text-green-600" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex flex-col">
                          <span className="font-medium">{activity.name}</span>
                          {activity.wbsId && wbsMap.has(activity.wbsId) && (
                            <span className="text-xs text-gray-500">
                              {wbsMap.get(activity.wbsId)?.code} - {wbsMap.get(activity.wbsId)?.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {showColumns.wbs && (
                    <TableCell>
                      <div className="text-xs">
                        {activity.wbsId && wbsMap.has(activity.wbsId) ? (
                          <Badge variant="outline" className="text-xs">
                            {wbsMap.get(activity.wbsId)?.code}
                          </Badge>
                        ) : '-'}
                      </div>
                    </TableCell>
                  )}
                  {showColumns.activityCodes && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {activity.activityCodes && Object.keys(activity.activityCodes as any).length > 0 ? (
                          Object.entries(activity.activityCodes as any).slice(0, 2).map(([key, value]) => (
                            <Badge key={key} variant="secondary" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {showColumns.customFields && (
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {activity.customFields && Object.keys(activity.customFields as any).length > 0 ? (
                          Object.entries(activity.customFields as any).slice(0, 2).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {key}: {String(value)}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
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