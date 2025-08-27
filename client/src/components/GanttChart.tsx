import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Activity, Relationship, Wbs } from "@shared/schema";
import { BarChart3, Calendar, AlertCircle, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { format, parseISO, differenceInDays, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";

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
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const dayWidth = 30;
  const rowHeight = 40;
  
  // Calculate date range
  const { projectStart, projectEnd, totalDays } = useMemo(() => {
    if (!activities.length) {
      const today = new Date();
      return {
        projectStart: today,
        projectEnd: addDays(today, 60),
        totalDays: 60
      };
    }
    
    // Find min and max dates
    let minDate = new Date();
    let maxDate = new Date();
    let hasValidDates = false;
    
    activities.forEach(activity => {
      if (activity.earlyStart) {
        const startDate = parseISO(activity.earlyStart);
        if (!hasValidDates || startDate < minDate) {
          minDate = startDate;
          hasValidDates = true;
        }
      }
      if (activity.earlyFinish) {
        const endDate = parseISO(activity.earlyFinish);
        if (!hasValidDates || endDate > maxDate) {
          maxDate = endDate;
          hasValidDates = true;
        }
      }
    });
    
    if (!hasValidDates) {
      const today = new Date();
      minDate = today;
      maxDate = addDays(today, 60);
    }
    
    // Add padding
    const start = addDays(minDate, -7);
    const end = addDays(maxDate, 14);
    const days = Math.max(differenceInDays(end, start) + 1, 30);
    
    return {
      projectStart: start,
      projectEnd: end,
      totalDays: days
    };
  }, [activities]);
  
  // Generate calendar headers
  const calendarData = useMemo(() => {
    const days = eachDayOfInterval({ start: projectStart, end: projectEnd });
    const months: Array<{ month: string; startDay: number; days: number }> = [];
    
    let currentMonth = '';
    let monthStartDay = 0;
    let daysInMonth = 0;
    
    days.forEach((day, index) => {
      const monthName = format(day, 'MMM yyyy');
      if (monthName !== currentMonth) {
        if (currentMonth) {
          months.push({ month: currentMonth, startDay: monthStartDay, days: daysInMonth });
        }
        currentMonth = monthName;
        monthStartDay = index;
        daysInMonth = 1;
      } else {
        daysInMonth++;
      }
    });
    
    if (currentMonth) {
      months.push({ month: currentMonth, startDay: monthStartDay, days: daysInMonth });
    }
    
    return {
      days: days.map((day, index) => ({
        date: day,
        dayOfMonth: format(day, 'd'),
        dayOfWeek: format(day, 'EEE'),
        fullDate: format(day, 'MMM d, yyyy'),
        isWeekend: isWeekend(day),
        position: index * dayWidth
      })),
      months
    };
  }, [projectStart, projectEnd, dayWidth]);
  
  // Sort activities by start date
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      if (!a.earlyStart || !b.earlyStart) return 0;
      return parseISO(a.earlyStart).getTime() - parseISO(b.earlyStart).getTime();
    });
  }, [activities]);
  
  // Calculate activity positions
  const getActivityPosition = (activity: Activity) => {
    if (!activity.earlyStart || !activity.earlyFinish) {
      return null;
    }
    
    const start = parseISO(activity.earlyStart);
    const end = parseISO(activity.earlyFinish);
    const leftOffset = differenceInDays(start, projectStart);
    const duration = differenceInDays(end, start) + 1;
    
    return {
      left: leftOffset * dayWidth,
      width: Math.max(duration * dayWidth - 2, 10),
      duration
    };
  };
  
  // Get activity color
  const getActivityStyle = (activity: Activity) => {
    let backgroundColor = '#9ca3af'; // Default gray
    
    if (activity.isCritical) {
      backgroundColor = '#dc2626'; // Red
    } else if (activity.status === 'Completed') {
      backgroundColor = '#16a34a'; // Green
    } else if (activity.status === 'InProgress') {
      backgroundColor = '#2563eb'; // Blue
    }
    
    if (selectedActivity === activity.id) {
      backgroundColor = '#f59e0b'; // Amber when selected
    }
    
    return { backgroundColor };
  };
  
  // Build activity map for relationships
  const activityMap = useMemo(() => {
    const map = new Map<string, { activity: Activity; index: number; position: any }>();
    sortedActivities.forEach((activity, index) => {
      const position = getActivityPosition(activity);
      if (position) {
        map.set(activity.id, { activity, index, position });
      }
    });
    return map;
  }, [sortedActivities, projectStart, dayWidth]);
  
  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              <span>Gantt Chart</span>
            </div>
            <div className="flex items-center gap-4 text-sm font-normal">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-600 rounded" />
                <span>Critical</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-600 rounded" />
                <span>In Progress</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-600 rounded" />
                <span>Completed</span>
              </div>
              <span className="text-gray-500 ml-2">{activities.length} activities</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {activities.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p>No activities to display</p>
              <p className="text-sm mt-2">Generate a schedule to see the Gantt chart</p>
            </div>
          ) : (
            <div className="flex border-t">
              {/* Activity List */}
              <div className="w-[400px] border-r bg-gray-50 flex-shrink-0">
                <div className="sticky top-0 bg-white border-b px-4 py-2 font-medium text-sm z-20">
                  <div className="flex justify-between">
                    <span>Activity</span>
                    <span>Dates</span>
                  </div>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: '600px' }}>
                  {sortedActivities.map((activity, index) => (
                    <div
                      key={activity.id}
                      className={`px-4 py-2 border-b text-sm cursor-pointer transition-colors ${
                        selectedActivity === activity.id ? 'bg-amber-50 border-amber-200' :
                        hoveredActivity === activity.id ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
                      }`}
                      style={{ minHeight: rowHeight }}
                      onClick={() => {
                        setSelectedActivity(activity.id);
                        onActivitySelect(activity.id);
                      }}
                      onMouseEnter={() => setHoveredActivity(activity.id)}
                      onMouseLeave={() => setHoveredActivity(null)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {activity.isCritical && (
                              <AlertCircle className="w-3 h-3 text-red-600" />
                            )}
                            <span className="font-mono text-xs text-gray-500">
                              {activity.activityId}
                            </span>
                            <span className="font-medium truncate">
                              {activity.name}
                            </span>
                          </div>
                          {activity.percentComplete > 0 && (
                            <div className="mt-1 flex items-center gap-2">
                              <div className="flex-1 h-1 bg-gray-200 rounded">
                                <div 
                                  className="h-1 bg-green-500 rounded"
                                  style={{ width: `${activity.percentComplete}%` }}
                                />
                              </div>
                              <span className="text-xs text-green-600">
                                {activity.percentComplete}%
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 ml-2 text-right">
                          {activity.earlyStart && (
                            <div>{format(parseISO(activity.earlyStart), 'MMM d')}</div>
                          )}
                          <div className="font-medium">{activity.originalDuration}d</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Gantt Chart Area */}
              <div className="flex-1 overflow-hidden">
                <div className="sticky top-0 bg-white z-10">
                  {/* Month headers */}
                  <div className="flex border-b">
                    {calendarData.months.map((month, idx) => (
                      <div
                        key={idx}
                        className="border-r text-xs font-medium px-2 py-1 bg-gray-50"
                        style={{ width: month.days * dayWidth }}
                      >
                        {month.month}
                      </div>
                    ))}
                  </div>
                  {/* Day headers */}
                  <div className="flex border-b">
                    {calendarData.days.map((day, idx) => (
                      <div
                        key={idx}
                        className={`border-r text-xs text-center py-1 ${
                          day.isWeekend ? 'bg-gray-100' : ''
                        }`}
                        style={{ width: dayWidth }}
                        title={day.fullDate}
                      >
                        <div className="text-[10px] text-gray-400">{day.dayOfWeek[0]}</div>
                        <div>{day.dayOfMonth}</div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <ScrollArea className="w-full">
                  <div 
                    className="relative"
                    style={{ 
                      width: totalDays * dayWidth,
                      minHeight: sortedActivities.length * rowHeight 
                    }}
                  >
                    {/* Weekend backgrounds */}
                    {calendarData.days.filter(d => d.isWeekend).map((day, idx) => (
                      <div
                        key={`weekend-${idx}`}
                        className="absolute top-0 bottom-0 bg-gray-50 opacity-50"
                        style={{ 
                          left: day.position, 
                          width: dayWidth,
                          height: sortedActivities.length * rowHeight
                        }}
                      />
                    ))}
                    
                    {/* Relationship lines */}
                    <svg 
                      className="absolute top-0 left-0 pointer-events-none"
                      style={{ 
                        width: totalDays * dayWidth,
                        height: sortedActivities.length * rowHeight
                      }}
                    >
                      {relationships.map(rel => {
                        const pred = activityMap.get(rel.predecessorId);
                        const succ = activityMap.get(rel.successorId);
                        
                        if (!pred || !succ) return null;
                        
                        const x1 = pred.position.left + pred.position.width;
                        const y1 = pred.index * rowHeight + rowHeight / 2;
                        const x2 = succ.position.left;
                        const y2 = succ.index * rowHeight + rowHeight / 2;
                        
                        // Draw L-shaped line
                        const path = y1 === y2 
                          ? `M ${x1} ${y1} L ${x2} ${y2}` 
                          : `M ${x1} ${y1} L ${x1 + 10} ${y1} L ${x1 + 10} ${y2} L ${x2} ${y2}`;
                        
                        return (
                          <g key={rel.id}>
                            <path
                              d={path}
                              stroke={pred.activity.isCritical && succ.activity.isCritical ? '#dc2626' : '#94a3b8'}
                              strokeWidth="2"
                              fill="none"
                            />
                            <polygon
                              points={`${x2},${y2} ${x2-5},${y2-3} ${x2-5},${y2+3}`}
                              fill={pred.activity.isCritical && succ.activity.isCritical ? '#dc2626' : '#94a3b8'}
                            />
                          </g>
                        );
                      })}
                    </svg>
                    
                    {/* Activity bars */}
                    {sortedActivities.map((activity, index) => {
                      const position = getActivityPosition(activity);
                      if (!position) return null;
                      
                      const barTop = index * rowHeight + 8;
                      const barHeight = 24;
                      const style = getActivityStyle(activity);
                      
                      return (
                        <Tooltip key={activity.id}>
                          <TooltipTrigger asChild>
                            <div
                              className="absolute rounded cursor-pointer shadow hover:shadow-md transition-all"
                              style={{
                                left: position.left,
                                top: barTop,
                                width: position.width,
                                height: barHeight,
                                ...style,
                                zIndex: hoveredActivity === activity.id ? 10 : 1
                              }}
                              onClick={() => {
                                setSelectedActivity(activity.id);
                                onActivitySelect(activity.id);
                              }}
                              onMouseEnter={() => setHoveredActivity(activity.id)}
                              onMouseLeave={() => setHoveredActivity(null)}
                            >
                              {activity.percentComplete > 0 && (
                                <div
                                  className="absolute top-0 left-0 h-full bg-black bg-opacity-20 rounded"
                                  style={{ width: `${activity.percentComplete}%` }}
                                />
                              )}
                              {position.width > 50 && (
                                <div className="px-1 text-white text-xs truncate leading-6">
                                  {activity.activityId}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1 text-sm">
                              <div className="font-medium">{activity.name}</div>
                              <div>ID: {activity.activityId}</div>
                              <div>Duration: {activity.originalDuration} days</div>
                              <div>
                                Start: {activity.earlyStart && format(parseISO(activity.earlyStart), 'MMM d, yyyy')}
                              </div>
                              <div>
                                Finish: {activity.earlyFinish && format(parseISO(activity.earlyFinish), 'MMM d, yyyy')}
                              </div>
                              {activity.percentComplete > 0 && (
                                <div className="text-green-600">Progress: {activity.percentComplete}%</div>
                              )}
                              {activity.isCritical && (
                                <div className="text-red-600 font-medium">Critical Path</div>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}