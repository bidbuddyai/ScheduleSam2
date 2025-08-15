import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOpenItemSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { OpenItem } from "@shared/schema";
import type { z } from "zod";

type InsertOpenItemForm = z.infer<typeof insertOpenItemSchema>;

interface OpenItemsSectionProps {
  projectId: string;
  isEmbedded?: boolean;
}

export default function OpenItemsSection({ projectId, isEmbedded = false }: OpenItemsSectionProps) {
  const { toast } = useToast();
  const [showNewItem, setShowNewItem] = useState(false);

  const { data: openItems = [], isLoading } = useQuery<OpenItem[]>({
    queryKey: ["/api/projects", projectId, "open-items"],
    queryFn: async () => {
      // Since we don't have a specific endpoint for project open items in the routes,
      // we'll simulate the query structure. In a real app, this would be implemented.
      return [];
    }
  });

  const form = useForm<InsertOpenItemForm>({
    resolver: zodResolver(insertOpenItemSchema.omit({ projectId: true, sourceMeetingId: true })),
    defaultValues: {
      item: "",
      owner: "",
      ballInCourt: "",
      targetClose: "",
      status: "Open",
      notes: ""
    }
  });

  const createOpenItemMutation = useMutation({
    mutationFn: async (data: InsertOpenItemForm) => {
      // This would need to be implemented in the backend routes
      const response = await apiRequest("POST", `/api/projects/${projectId}/open-items`, {
        ...data,
        projectId,
        sourceMeetingId: "" // This would come from context
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "open-items"] });
      setShowNewItem(false);
      form.reset();
      toast({
        title: "Open item created",
        description: "The open item has been added to the project log.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create open item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertOpenItemForm) => {
    createOpenItemMutation.mutate(data);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-yellow-100 text-yellow-800';
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
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-brand-secondary">Open Items Log</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const content = (
    <div className="p-6">
      {openItems.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-clipboard-check text-4xl text-gray-400 mb-4"></i>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No open items</h3>
          <p className="text-gray-500 mb-4">All project items have been resolved.</p>
          <Button 
            onClick={() => setShowNewItem(true)}
            className="bg-brand-secondary text-white hover:bg-brand-primary"
            data-testid="button-create-first-open-item"
          >
            Add Open Item
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {openItems.slice(0, 5).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg" data-testid={`row-open-item-${item.id}`}>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{item.item}</p>
                <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                  <span>Owner: {item.owner}</span>
                  <span>Due: {item.targetClose ? new Date(item.targetClose).toLocaleDateString() : 'TBD'}</span>
                </div>
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(item.status)}`}>
                {item.status}
              </span>
            </div>
          ))}
          {openItems.length > 5 && (
            <p className="text-xs text-gray-400 text-center">+{openItems.length - 5} more items</p>
          )}
        </div>
      )}
      
      <Dialog open={showNewItem} onOpenChange={setShowNewItem}>
        <DialogTrigger asChild>
          <Button 
            className="mt-4 bg-brand-secondary text-white hover:bg-brand-primary"
            data-testid="button-add-open-item"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Item
          </Button>
        </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Open Item</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="item"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} rows={3} data-testid="textarea-open-item" />
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
                          <FormControl>
                            <Input {...field} data-testid="input-open-item-owner" />
                          </FormControl>
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
                          <FormControl>
                            <Input {...field} data-testid="input-open-item-ball-in-court" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="targetClose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Close</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-open-item-target-close" />
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
                              <SelectTrigger data-testid="select-open-item-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Open">Open</SelectItem>
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
                          <Textarea {...field} rows={2} data-testid="textarea-open-item-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewItem(false)}
                      data-testid="button-cancel-open-item"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createOpenItemMutation.isPending}
                      className="bg-brand-secondary text-white hover:bg-brand-primary"
                      data-testid="button-create-open-item"
                    >
                      {createOpenItemMutation.isPending ? "Creating..." : "Add Item"}
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
          <i className="fas fa-exclamation-triangle"></i>
          <span>Open Items Log</span>
        </h3>
      </div>
      {content}
    </div>
  );
}
