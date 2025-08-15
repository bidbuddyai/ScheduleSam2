import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAttendanceSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Attendance } from "@shared/schema";
import type { z } from "zod";

type InsertAttendanceForm = z.infer<typeof insertAttendanceSchema>;

interface AttendanceSectionProps {
  meetingId: string;
  isCompact?: boolean;
}

export default function AttendanceSection({ meetingId, isCompact = false }: AttendanceSectionProps) {
  const { toast } = useToast();
  const [showNewAttendee, setShowNewAttendee] = useState(false);

  const { data: attendance = [], isLoading } = useQuery<Attendance[]>({
    queryKey: ["/api/meetings", meetingId, "attendance"],
  });

  const form = useForm<InsertAttendanceForm>({
    resolver: zodResolver(insertAttendanceSchema.omit({ meetingId: true })),
    defaultValues: {
      role: "",
      name: "",
      company: "",
      presentBool: true
    }
  });

  const addAttendeeMutation = useMutation({
    mutationFn: async (data: InsertAttendanceForm) => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/attendance`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "attendance"] });
      setShowNewAttendee(false);
      form.reset();
      toast({
        title: "Attendee added",
        description: "The attendee has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add attendee. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateAttendeeMutation = useMutation({
    mutationFn: async ({ id, presentBool }: { id: string; presentBool: boolean }) => {
      const response = await apiRequest("PUT", `/api/attendance/${id}`, { presentBool });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "attendance"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertAttendanceForm) => {
    addAttendeeMutation.mutate(data);
  };

  if (isLoading) {
    if (isCompact) {
      return (
        <div className="animate-pulse space-y-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 bg-gray-200 rounded w-3/4"></div>
          ))}
        </div>
      );
    }
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-brand-secondary">Attendance</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isCompact) {
    return (
      <div className="space-y-1">
        {attendance.length > 0 ? (
          attendance.slice(0, 5).map((attendee) => (
            <div key={attendee.id} className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                attendee.presentBool ? 'bg-green-500' : 'bg-gray-300'
              }`}></div>
              <span className={attendee.presentBool ? 'text-gray-900' : 'text-gray-500'}>
                {attendee.name}
                {attendee.company && ` (${attendee.company})`}
              </span>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No attendees listed</p>
        )}
        {attendance.length > 5 && (
          <p className="text-xs text-gray-400">+{attendance.length - 5} more</p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
          <i className="fas fa-users"></i>
          <span>Attendance</span>
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {attendance.map((attendee) => (
            <div key={attendee.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
              <div>
                <div className="font-medium text-gray-900">{attendee.name}</div>
                <div className="text-sm text-gray-500">{attendee.role} - {attendee.company}</div>
              </div>
              <div className="flex items-center">
                <Checkbox
                  checked={attendee.presentBool}
                  onCheckedChange={(checked) => 
                    updateAttendeeMutation.mutate({ 
                      id: attendee.id, 
                      presentBool: checked as boolean 
                    })
                  }
                  className="w-4 h-4"
                  data-testid={`checkbox-attendance-${attendee.id}`}
                />
                <label className="ml-2 text-sm text-gray-600">Present</label>
              </div>
            </div>
          ))}
        </div>
        
        <Dialog open={showNewAttendee} onOpenChange={setShowNewAttendee}>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              className="mt-4 text-brand-secondary hover:text-brand-primary"
              data-testid="button-add-attendee"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Attendee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Attendee</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-attendee-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-attendee-role" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-attendee-company" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="presentBool"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-attendee-present"
                        />
                      </FormControl>
                      <FormLabel>Present</FormLabel>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewAttendee(false)}
                    data-testid="button-cancel-attendee"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={addAttendeeMutation.isPending}
                    className="bg-brand-secondary text-white hover:bg-brand-primary"
                    data-testid="button-save-attendee"
                  >
                    {addAttendeeMutation.isPending ? "Adding..." : "Add Attendee"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
