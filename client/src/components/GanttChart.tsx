import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Activity, Relationship, Wbs } from "@shared/schema";
import { BarChart3, ChevronDown, ChevronRight } from "lucide-react";
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
  const [expandedWbs, setExpandedWbs] = useState<Set<string>>(new Set());
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);
  
  // Calculate date range from activities
  const { startDate, endDate, dayWidth, totalDays } = useMemo(() => {
    if (!activities.length) {
      const today = new Date();
      return {
        startDate: today,
        endDate: addDays(today, 30),
        dayWidth: 30,
        totalDays: 30
      };
    }
    
    const dates = activities.flatMap(a => {
      const dates = [];
      if (a.earlyStart) dates.push(parseISO(a.earlyStart));
      if (a.earlyFinish) dates.push(parseISO(a.earlyFinish));
      if (a.actualStart) dates.push(parseISO(a.actualStart));
      if (a.actualFinish) dates.push(parseISO(a.actualFinish));
      return dates;
    }).filter(d => !isNaN(d.getTime()));
    
    if (!dates.length) {
      const today = new Date();
      return {
        startDate: today,
        endDate: addDays(today, 30),
        dayWidth: 30,
        totalDays: 30
      };
    }
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Extend range by a week on each side
    const start = addDays(minDate, -7);
    const end = addDays(maxDate, 7);
    const days = differenceInDays(end, start) || 1;
    
    return {
      startDate: start,
      endDate: end,
      dayWidth: 30,
      totalDays: days
    };
  }, [activities]);
  
  // Generate timeline header dates
  const timelineDates = useMemo(() => {
    const dates = [];
    const monthDates = [];
    let currentMonth = startOfMonth(startDate);
    
    // Generate month headers
    while (currentMonth <= endDate) {
      const monthEnd = endOfMonth(currentMonth);
      const monthStart = currentMonth < startDate ? startDate : currentMonth;
      const monthEndInRange = monthEnd > endDate ? endDate : monthEnd;
      const daysInMonth = differenceInDays(monthEndInRange, monthStart) + 1;
      
      monthDates.push({
        date: currentMonth,
        label: format(currentMonth, 'MMM yyyy'),
        days: daysInMonth,
        startDay: differenceInDays(monthStart, startDate)
      });
      
      currentMonth = addDays(monthEnd, 1);
    }
    
    // Generate day headers
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    const dayHeaders = allDays.map((date, index) => ({
      date,
      label: format(date, 'd'),
      isWeekend: isWeekend(date),
      position: index * dayWidth
    }));
    
    return { months: monthDates, days: dayHeaders };
  }, [startDate, endDate, dayWidth]);
  
  // Sort activities by WBS and start date
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => {
      // First sort by WBS if available
      const wbsA = a.wbsId || '';
      const wbsB = b.wbsId || '';
      if (wbsA !== wbsB) return wbsA.localeCompare(wbsB);
      
      // Then by early start date
      const dateA = a.earlyStart ? parseISO(a.earlyStart) : new Date();
      const dateB = b.earlyStart ? parseISO(b.earlyStart) : new Date();
      return dateA.getTime() - dateB.getTime();
    });
  }, [activities]);
  
  const getActivityPosition = (activity: Activity) => {
    const start = activity.actualStart || activity.earlyStart;
    const finish = activity.actualFinish || activity.earlyFinish;
    
    if (!start || !finish) return null;
    
    const startDay = differenceInDays(parseISO(start), startDate);
    const duration = differenceInDays(parseISO(finish), parseISO(start)) + 1;
    
    return {
      left: startDay * dayWidth,
      width: duration * dayWidth,
      startDay,
      duration
    };
  };
  
  const getActivityColor = (activity: Activity) => {
    if (activity.isCritical) return '#ef4444'; // Red for critical
    if (activity.status === 'Completed') return '#10b981'; // Green for completed
    if (activity.status === 'InProgress') return '#3b82f6'; // Blue for in progress
    return '#6b7280'; // Gray for not started
  };
  
  const toggleWbs = (wbsId: string) => {
    const newExpanded = new Set(expandedWbs);
    if (newExpanded.has(wbsId)) {
      newExpanded.delete(wbsId);
    } else {
      newExpanded.add(wbsId);
    }
    setExpandedWbs(newExpanded);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>Gantt Chart</span>
          </div>
          <div className="text-sm font-normal text-gray-500">
            {activities.length} activities
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Activities</h3>
            <p className="text-sm">Generate a schedule to see the Gantt chart</p>
          </div>
        ) : (
          <div className="flex">
            {/* Activity list */}
            <div className="flex-shrink-0 w-80 border-r">
              <div className="sticky top-0 bg-white border-b px-4 py-2 font-medium text-sm">
                Activity Name
              </div>
              <ScrollArea className="h-[600px]">
                {sortedActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className={`px-4 py-2 border-b text-sm hover:bg-gray-50 cursor-pointer ${
                      hoveredActivity === activity.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => onActivitySelect(activity.id)}
                    onMouseEnter={() => setHoveredActivity(activity.id)}
                    onMouseLeave={() => setHoveredActivity(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 truncate">
                        <span className="text-gray-500 mr-2">{activity.activityId}</span>
                        {activity.name}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 ml-2">
                        {activity.originalDuration}d
                      </div>
                    </div>
                    {activity.percentComplete > 0 && (
                      <div className="mt-1">
                        <div className="h-1 bg-gray-200 rounded">
                          <div
                            className="h-1 bg-green-500 rounded"
                            style={{ width: `${activity.percentComplete}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </ScrollArea>
            </div>
            
            {/* Timeline */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="w-full">
                <div style={{ width: totalDays * dayWidth }}>
                  {/* Timeline header */}
                  <div className="sticky top-0 bg-white border-b">
                    {/* Month row */}
                    <div className="flex border-b">
                      {timelineDates.months.map((month, idx) => (
                        <div
                          key={idx}
                          className="border-r text-xs font-medium px-2 py-1"
                          style={{ width: month.days * dayWidth }}
                        >
                          {month.label}
                        </div>
                      ))}
                    </div>
                    {/* Day row */}
                    <div className="flex">
                      {timelineDates.days.map((day, idx) => (
                        <div
                          key={idx}
                          className={`border-r text-xs text-center py-1 ${
                            day.isWeekend ? 'bg-gray-50' : ''
                          }`}
                          style={{ width: dayWidth }}
                        >
                          {day.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Activity bars */}
                  <div className="relative">
                    {sortedActivities.map((activity, index) => {
                      const position = getActivityPosition(activity);
                      if (!position) return null;
                      
                      return (
                        <div
                          key={activity.id}
                          className="relative h-[40px] border-b hover:bg-gray-50"
                          onMouseEnter={() => setHoveredActivity(activity.id)}
                          onMouseLeave={() => setHoveredActivity(null)}
                        >
                          {/* Weekend backgrounds */}
                          {timelineDates.days.map((day, idx) => (
                            day.isWeekend && (
                              <div
                                key={idx}
                                className="absolute top-0 bottom-0 bg-gray-50"
                                style={{ 
                                  left: day.position, 
                                  width: dayWidth 
                                }}
                              />
                            )
                          ))}
                          
                          {/* Activity bar */}
                          <div
                            className="absolute top-2 h-6 rounded cursor-pointer transition-all"
                            style={{
                              left: position.left,
                              width: position.width,
                              backgroundColor: getActivityColor(activity),
                              opacity: hoveredActivity === activity.id ? 1 : 0.8
                            }}
                            onClick={() => onActivitySelect(activity.id)}
                          >
                            {/* Progress bar */}
                            {activity.percentComplete > 0 && (
                              <div
                                className="absolute top-0 left-0 h-full bg-black bg-opacity-20 rounded"
                                style={{ width: `${activity.percentComplete}%` }}
                              />
                            )}
                            
                            {/* Milestone diamond for zero duration */}
                            {activity.originalDuration === 0 && (
                              <div
                                className="absolute top-0 w-6 h-6 transform rotate-45"
                                style={{
                                  backgroundColor: getActivityColor(activity),
                                  left: -3
                                }}
                              />
                            )}
                          </div>
                          
                          {/* Relationship lines */}
                          {relationships
                            .filter(r => r.predecessorId === activity.id)
                            .map(rel => {
                              const successor = sortedActivities.find(a => a.id === rel.successorId);
                              if (!successor) return null;
                              const succPos = getActivityPosition(successor);
                              if (!succPos) return null;
                              
                              return (
                                <svg
                                  key={rel.id}
                                  className="absolute pointer-events-none"
                                  style={{
                                    left: position.left + position.width,
                                    top: 14,
                                    width: Math.max(0, succPos.left - (position.left + position.width)) + 2,
                                    height: 40 * (sortedActivities.indexOf(successor) - index)
                                  }}
                                >
                                  <path
                                    d={`M 0 0 L ${succPos.left - (position.left + position.width)} ${40 * (sortedActivities.indexOf(successor) - index)}`}
                                    stroke="#94a3b8"
                                    strokeWidth="1"
                                    fill="none"
                                    markerEnd="url(#arrowhead)"
                                  />
                                  <defs>
                                    <marker
                                      id="arrowhead"
                                      markerWidth="10"
                                      markerHeight="7"
                                      refX="9"
                                      refY="3.5"
                                      orient="auto"
                                    >
                                      <polygon
                                        points="0 0, 10 3.5, 0 7"
                                        fill="#94a3b8"
                                      />
                                    </marker>
                                  </defs>
                                </svg>
                              );
                            })}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}