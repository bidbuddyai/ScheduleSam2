import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Calendar } from "@shared/schema";
import { Calendar as CalendarIcon, Plus } from "lucide-react";

interface CalendarManagerProps {
  calendars: Calendar[];
  projectId: string;
}

export default function CalendarManager({ calendars, projectId }: CalendarManagerProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <span>Work Calendars</span>
          </div>
          <Button size="sm" data-testid="button-new-calendar">
            <Plus className="w-4 h-4 mr-2" />
            New Calendar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-500 py-12">
          <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">Calendar Management</h3>
          <p className="text-sm mb-4">Work calendar configuration coming soon</p>
          <div className="text-sm text-left max-w-md mx-auto space-y-2">
            <p>Features will include:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Custom work schedules</li>
              <li>Holiday and exception management</li>
              <li>Multiple calendar assignments</li>
              <li>Resource-specific calendars</li>
              <li>Shift and non-working time</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}