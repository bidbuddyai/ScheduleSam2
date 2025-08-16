import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertActionItemSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import type { ActionItem, Attendance } from "@shared/schema";
import type { z } from "zod";

type InsertActionItemForm = z.infer<typeof insertActionItemSchema>;

interface ActionItemsSectionProps {
  meetingId: string;
  isEmbedded?: boolean;
}

export default function ActionItemsSection({ meetingId, isEmbedded = false }: ActionItemsSectionProps) {
  const { toast } = useToast();
  const [showNewAction, setShowNewAction] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);

  const { data: actionItems = [], isLoading } = useQuery<ActionItem[]>({
    queryKey: ["/api/meetings", meetingId, "actions"],
  });

  const { data: attendance = [] } = useQuery<Attendance[]>({
    queryKey: ["/api/meetings", meetingId, "attendance"],
  });

  // Get list of unique people from attendance and existing action items
  const peopleList = useMemo(() => {
    const peopleSet = new Set<string>();
    
    // Add from attendance
    attendance.forEach(a => {
      if (a.name) peopleSet.add(a.name);
    });
    
    // Add from existing action items
    actionItems.forEach(action => {
      if (action.owner) peopleSet.add(action.owner);
      if (action.ballInCourt) peopleSet.add(action.ballInCourt);
    });
    
    // Add some common roles
    ['Project Manager', 'Site Supervisor', 'Contractor', 'Architect', 'Engineer', 'Inspector'].forEach(role => {
      peopleSet.add(role);
    });
    
    return Array.from(peopleSet).sort();
  }, [attendance, actionItems]);

  const form = useForm<InsertActionItemForm>({
    resolver: zodResolver(insertActionItemSchema.omit({ meetingId: true })),
    defaultValues: {
      agendaItemId: "",
      action: "",
      owner: "",
      ballInCourt: "",
      dueDate: "",
      status: "Open",
      notes: "",
      sourceMeetingId: ""
    }
  });

  const createActionMutation = useMutation({
    mutationFn: async (data: InsertActionItemForm) => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/actions`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "actions"] });
      setShowNewAction(false);
      form.reset();
      toast({
        title: "Action item created",
        description: "The action item has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create action item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ActionItem> }) => {
      const response = await apiRequest("PUT", `/api/actions/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "actions"] });
      toast({
        title: "Action item updated",
        description: "The action item has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update action item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteActionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/actions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "actions"] });
      toast({
        title: "Action item deleted",
        description: "The action item has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete action item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertActionItemForm) => {
    createActionMutation.mutate(data);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Closed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    if (isEmbedded) {
      return (
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-brand-secondary">Action Items</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <div className="p-6">
      {actionItems.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-tasks text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No action items yet</h3>
          <p className="text-gray-500 mb-4">Create your first action item to track progress.</p>
          <Button 
            onClick={() => setShowNewAction(true)}
            className="bg-brand-secondary text-white hover:bg-brand-primary"
            data-testid="button-create-first-action"
          >
            Add Action Item
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {actionItems.map((action) => (
            <div key={action.id} className="border border-gray-200 rounded-lg p-4" data-testid={`action-item-${action.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(action.status)}`}>
                      {action.status}
                    </span>
                    {action.dueDate && (
                      <span className="text-sm text-gray-500">
                        Due: {new Date(action.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-900 font-medium mb-2">{action.action}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span><strong>Owner:</strong> {action.owner || 'Unassigned'}</span>
                    <span><strong>Ball in Court:</strong> {action.ballInCourt || 'TBD'}</span>
                  </div>
                  {action.notes && (
                    <p className="text-sm text-gray-600 mt-2">{action.notes}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {action.status !== "Closed" && (
                    <button 
                      className="text-green-600 hover:text-green-700"
                      onClick={() => updateActionMutation.mutate({ id: action.id, updates: { status: "Closed" } })}
                      title="Mark Complete"
                      data-testid={`button-complete-action-${action.id}`}
                    >
                      <i className="fas fa-check-circle"></i>
                    </button>
                  )}
                  <Select
                    value={action.status}
                    onValueChange={(value) => updateActionMutation.mutate({ id: action.id, updates: { status: value as "Open" | "In Progress" | "Closed" } })}
                  >
                    <SelectTrigger className="w-32" data-testid={`select-status-${action.id}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <button 
                    className="text-red-600 hover:text-red-700"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this action item?")) {
                        deleteActionMutation.mutate(action.id);
                      }
                    }}
                    title="Delete"
                    data-testid={`button-delete-action-${action.id}`}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <Dialog open={showNewAction} onOpenChange={setShowNewAction}>
        <DialogTrigger asChild>
          <Button 
            className="mt-4 bg-brand-secondary text-white hover:bg-brand-primary"
            data-testid="button-add-action"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Action
          </Button>
        </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Action Item</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="action"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Action</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} data-testid="textarea-action-item" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="owner"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Owner</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-action-owner">
                                <SelectValue placeholder="Select owner" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {peopleList.map((person) => (
                                <SelectItem key={person} value={person}>
                                  {person}
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
                      name="ballInCourt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ball in Court</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-action-ball-in-court">
                                <SelectValue placeholder="Select responsible party" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">TBD</SelectItem>
                              {peopleList.map((person) => (
                                <SelectItem key={person} value={person}>
                                  {person}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="dueDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Due Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ""} data-testid="input-action-due-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-action-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Open">Open</SelectItem>
                              <SelectItem value="In Progress">In Progress</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
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
                          <Textarea {...field} value={field.value || ""} rows={2} data-testid="textarea-action-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewAction(false)}
                      data-testid="button-cancel-action"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createActionMutation.isPending}
                      className="bg-brand-secondary text-white hover:bg-brand-primary"
                      data-testid="button-create-action"
                    >
                      {createActionMutation.isPending ? "Creating..." : "Add Action"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
          <i className="fas fa-tasks"></i>
          <span>Action Items</span>
        </h3>
      </div>
      {content}
    </div>
  );
}
