import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize2, Grid3x3 } from "lucide-react";
import type { Activity } from "./ScheduleEditor";

interface GanttChartProps {
  activities: Activity[];
  projectStartDate: string;
  onActivityClick?: (activity: Activity) => void;
}

export default function GanttChart({ activities, projectStartDate, onActivityClick }: GanttChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(20); // pixels per day
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [hoveredActivity, setHoveredActivity] = useState<string | null>(null);
  
  const rowHeight = 32;
  const headerHeight = 60;
  const leftPanelWidth = 300;
  const arrowSize = 8;
  
  // Calculate project duration
  const getProjectDates = () => {
    const startDate = new Date(projectStartDate);
    let endDate = new Date(startDate);
    
    activities.forEach(activity => {
      if (activity.finishDate) {
        const actFinish = new Date(activity.finishDate);
        if (actFinish > endDate) {
          endDate = actFinish;
        }
      }
    });
    
    // Add buffer days
    endDate.setDate(endDate.getDate() + 7);
    
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return { startDate, endDate, totalDays };
  };
  
  const drawGanttChart = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const { startDate, totalDays } = getProjectDates();
    
    // Set canvas size
    canvas.width = leftPanelWidth + (totalDays * scale) + 100;
    canvas.height = headerHeight + (activities.length * rowHeight) + 50;
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid(ctx, startDate, totalDays);
    
    // Draw header
    drawHeader(ctx, startDate, totalDays);
    
    // Draw activities panel
    drawActivitiesPanel(ctx);
    
    // Draw dependency arrows first (behind bars)
    drawDependencyArrows(ctx, startDate);
    
    // Draw activity bars
    drawActivityBars(ctx, startDate);
    
    // Draw critical path overlay
    drawCriticalPath(ctx, startDate);
  };
  
  const drawGrid = (ctx: CanvasRenderingContext2D, startDate: Date, totalDays: number) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    
    // Vertical lines (days)
    for (let day = 0; day <= totalDays; day++) {
      const x = leftPanelWidth + (day * scale);
      
      // Weekend shading
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const dayOfWeek = currentDate.getDay();
      
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        ctx.fillStyle = '#f9fafb';
        ctx.fillRect(x, headerHeight, scale, canvasRef.current!.height - headerHeight);
      }
      
      // Grid line
      ctx.beginPath();
      ctx.moveTo(x, headerHeight);
      ctx.lineTo(x, canvasRef.current!.height);
      ctx.stroke();
    }
    
    // Horizontal lines (activities)
    for (let i = 0; i <= activities.length; i++) {
      const y = headerHeight + (i * rowHeight);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasRef.current!.width, y);
      ctx.stroke();
    }
  };
  
  const drawHeader = (ctx: CanvasRenderingContext2D, startDate: Date, totalDays: number) => {
    // Header background
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvasRef.current!.width, headerHeight);
    
    // Activity column header
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('Task Name', 10, 25);
    ctx.fillText('Duration', leftPanelWidth - 60, 25);
    
    // Date headers
    ctx.font = '11px Inter, sans-serif';
    let currentMonth = -1;
    
    for (let day = 0; day < totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      const x = leftPanelWidth + (day * scale);
      
      // Month header
      if (currentDate.getMonth() !== currentMonth) {
        currentMonth = currentDate.getMonth();
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.fillText(
          currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          x + 5,
          20
        );
      }
      
      // Day numbers
      if (scale >= 15) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(currentDate.getDate().toString(), x + 2, 45);
      }
    }
    
    // Header border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerHeight);
    ctx.lineTo(canvasRef.current!.width, headerHeight);
    ctx.stroke();
  };
  
  const drawActivitiesPanel = (ctx: CanvasRenderingContext2D) => {
    // Left panel background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, headerHeight, leftPanelWidth, canvasRef.current!.height - headerHeight);
    
    // Activity names and details
    activities.forEach((activity, index) => {
      const y = headerHeight + (index * rowHeight) + rowHeight / 2;
      
      // Highlight hovered row
      if (hoveredActivity === activity.id) {
        ctx.fillStyle = '#f0f9ff';
        ctx.fillRect(0, headerHeight + (index * rowHeight), canvasRef.current!.width, rowHeight);
      }
      
      // WBS number
      if (activity.wbs) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(activity.wbs, 10, y - 5);
      }
      
      // Activity name
      ctx.fillStyle = activity.isCritical ? '#dc2626' : '#1f2937';
      ctx.font = activity.isCritical ? 'bold 12px Inter, sans-serif' : '12px Inter, sans-serif';
      const maxWidth = leftPanelWidth - 80;
      const text = activity.activityName;
      
      // Truncate text if too long
      let displayText = text;
      if (ctx.measureText(text).width > maxWidth) {
        displayText = text.substring(0, 25) + '...';
      }
      ctx.fillText(displayText, 10, y + 5);
      
      // Duration
      ctx.fillStyle = '#6b7280';
      ctx.font = '11px Inter, sans-serif';
      ctx.fillText(`${activity.duration}d`, leftPanelWidth - 60, y + 5);
    });
    
    // Left panel border
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(leftPanelWidth, headerHeight);
    ctx.lineTo(leftPanelWidth, canvasRef.current!.height);
    ctx.stroke();
  };
  
  const drawActivityBars = (ctx: CanvasRenderingContext2D, startDate: Date) => {
    activities.forEach((activity, index) => {
      const y = headerHeight + (index * rowHeight) + 8;
      const barHeight = rowHeight - 16;
      
      // Calculate bar position
      const actStartDate = new Date(activity.startDate || projectStartDate);
      const startDays = Math.max(0, Math.floor((actStartDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      const x = leftPanelWidth + (startDays * scale);
      const width = activity.duration * scale;
      
      // Shadow for bars
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;
      
      // Draw bar based on status and criticality
      if (activity.isCritical) {
        // Critical path - red
        ctx.fillStyle = '#dc2626';
      } else if (activity.status === 'Completed') {
        // Completed - green
        ctx.fillStyle = '#16a34a';
      } else if (activity.status === 'In Progress') {
        // In progress - blue
        ctx.fillStyle = '#2563eb';
      } else {
        // Not started - gray
        ctx.fillStyle = '#6b7280';
      }
      
      // Draw main bar
      ctx.fillRect(x, y, width, barHeight);
      
      // Draw progress bar
      if (activity.percentComplete > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        const progressWidth = width * (activity.percentComplete / 100);
        ctx.fillRect(x, y + barHeight - 4, progressWidth, 4);
      }
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      
      // Draw milestone diamond for zero duration
      if (activity.duration === 0) {
        ctx.fillStyle = activity.isCritical ? '#dc2626' : '#6b7280';
        ctx.beginPath();
        ctx.moveTo(x, y + barHeight / 2);
        ctx.lineTo(x + 8, y);
        ctx.lineTo(x + 16, y + barHeight / 2);
        ctx.lineTo(x + 8, y + barHeight);
        ctx.closePath();
        ctx.fill();
      }
    });
  };
  
  const drawDependencyArrows = (ctx: CanvasRenderingContext2D, startDate: Date) => {
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.5;
    
    activities.forEach((activity, index) => {
      const y = headerHeight + (index * rowHeight) + rowHeight / 2;
      
      // Calculate activity position
      const actStartDate = new Date(activity.startDate || projectStartDate);
      const startDays = Math.floor((actStartDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const actX = leftPanelWidth + (startDays * scale);
      
      // Draw arrows to predecessors
      activity.predecessors.forEach(predId => {
        const predActivity = activities.find(a => a.activityId === predId);
        if (!predActivity) return;
        
        const predIndex = activities.indexOf(predActivity);
        const predY = headerHeight + (predIndex * rowHeight) + rowHeight / 2;
        
        // Calculate predecessor end position
        const predStartDate = new Date(predActivity.startDate || projectStartDate);
        const predStartDays = Math.floor((predStartDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const predEndX = leftPanelWidth + (predStartDays * scale) + (predActivity.duration * scale);
        
        // Set line style based on criticality
        if (activity.isCritical && predActivity.isCritical) {
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
        } else {
          ctx.strokeStyle = '#9ca3af';
          ctx.lineWidth = 1.5;
        }
        
        // Draw dependency line (FS relationship)
        ctx.beginPath();
        ctx.moveTo(predEndX, predY);
        
        if (predIndex === index) {
          // Same row - draw straight line
          ctx.lineTo(actX - arrowSize, y);
        } else {
          // Different rows - draw L-shaped line
          const midX = predEndX + 15;
          ctx.lineTo(midX, predY);
          ctx.lineTo(midX, y);
          ctx.lineTo(actX - arrowSize, y);
        }
        ctx.stroke();
        
        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(actX - arrowSize, y);
        ctx.lineTo(actX - arrowSize, y - 4);
        ctx.lineTo(actX, y);
        ctx.lineTo(actX - arrowSize, y + 4);
        ctx.closePath();
        ctx.fill();
      });
    });
  };
  
  const drawCriticalPath = (ctx: CanvasRenderingContext2D, startDate: Date) => {
    // Highlight critical path with thick red line
    const criticalActivities = activities.filter(a => a.isCritical);
    
    if (criticalActivities.length < 2) return;
    
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 3]);
    
    // Draw connecting lines between critical activities
    for (let i = 0; i < criticalActivities.length - 1; i++) {
      const current = criticalActivities[i];
      const next = criticalActivities[i + 1];
      
      // Check if next is actually a successor
      if (!next.predecessors.includes(current.activityId)) continue;
      
      const currentIndex = activities.indexOf(current);
      const nextIndex = activities.indexOf(next);
      
      const currentY = headerHeight + (currentIndex * rowHeight) + rowHeight / 2;
      const nextY = headerHeight + (nextIndex * rowHeight) + rowHeight / 2;
      
      // Calculate positions
      const currentStartDate = new Date(current.startDate || projectStartDate);
      const currentStartDays = Math.floor((currentStartDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const currentEndX = leftPanelWidth + (currentStartDays * scale) + (current.duration * scale);
      
      const nextStartDate = new Date(next.startDate || projectStartDate);
      const nextStartDays = Math.floor((nextStartDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const nextStartX = leftPanelWidth + (nextStartDays * scale);
      
      // Draw critical path highlight
      ctx.beginPath();
      ctx.moveTo(currentEndX, currentY);
      const midX = currentEndX + 20;
      ctx.lineTo(midX, currentY);
      ctx.lineTo(midX, nextY);
      ctx.lineTo(nextStartX, nextY);
      ctx.stroke();
    }
    
    ctx.setLineDash([]);
  };
  
  useEffect(() => {
    drawGanttChart();
  }, [activities, scale, projectStartDate]);
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const newScale = Math.max(5, Math.min(50, scale + (e.deltaY > 0 ? -2 : 2)));
      setScale(newScale);
    } else {
      // Scroll
      if (containerRef.current) {
        containerRef.current.scrollLeft += e.deltaX;
        containerRef.current.scrollTop += e.deltaY;
      }
    }
  };
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Grid3x3 className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Gantt Chart - MS Project View</span>
            <span className="sm:hidden">Gantt Chart</span>
          </CardTitle>
          <div className="flex gap-1 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScale(Math.max(5, scale - 5))}
              title="Zoom Out"
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0"
            >
              <ZoomOut className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Out</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScale(Math.min(50, scale + 5))}
              title="Zoom In"
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0"
            >
              <ZoomIn className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">In</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setScale(20)}
              title="Reset Zoom"
              className="h-8 w-8 sm:h-9 sm:w-auto sm:px-3 p-0"
            >
              <Maximize2 className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Reset</span>
            </Button>
          </div>
        </div>
        <div className="text-xs sm:text-sm text-gray-600 mt-2">
          <span className="inline-flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 sm:w-3 sm:h-3 bg-red-600 rounded"></span>
              <span className="hidden sm:inline">Critical Path</span>
              <span className="sm:hidden">Critical</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded"></span>
              <span className="hidden sm:inline">In Progress</span>
              <span className="sm:hidden">Progress</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 sm:w-3 sm:h-3 bg-green-600 rounded"></span>
              <span>Completed</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 sm:w-3 sm:h-3 bg-gray-600 rounded"></span>
              <span className="hidden sm:inline">Not Started</span>
              <span className="sm:hidden">Pending</span>
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={containerRef}
          className="overflow-auto border rounded-lg"
          style={{ maxHeight: '400px', cursor: 'grab' }}
          onWheel={handleWheel}
        >
          <div className="sm:hidden text-xs text-center p-2 bg-gray-50 border-b">
            Scroll horizontally to view timeline
          </div>
          <canvas
            ref={canvasRef}
            className="block"
            onMouseMove={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const y = e.clientY - rect.top - headerHeight;
              const index = Math.floor(y / rowHeight);
              if (index >= 0 && index < activities.length) {
                setHoveredActivity(activities[index].id);
              } else {
                setHoveredActivity(null);
              }
            }}
            onMouseLeave={() => setHoveredActivity(null)}
            onClick={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              const y = e.clientY - rect.top - headerHeight;
              const index = Math.floor(y / rowHeight);
              if (index >= 0 && index < activities.length) {
                onActivityClick?.(activities[index]);
              }
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}