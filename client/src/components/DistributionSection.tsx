import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDistributionSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Distribution } from "@shared/schema";
import type { z } from "zod";

type InsertDistributionForm = z.infer<typeof insertDistributionSchema>;

interface DistributionSectionProps {
  meetingId: string;
  isEmbedded?: boolean;
}

export default function DistributionSection({ meetingId, isEmbedded = false }: DistributionSectionProps) {
  const { toast } = useToast();
  const [showNewRecipient, setShowNewRecipient] = useState(false);

  const { data: distribution = [], isLoading } = useQuery<Distribution[]>({
    queryKey: ["/api/meetings", meetingId, "distribution"],
  });

  const form = useForm<InsertDistributionForm>({
    resolver: zodResolver(insertDistributionSchema.omit({ meetingId: true })),
    defaultValues: {
      recipient: "",
      email: "",
      sentBool: false
    }
  });

  const addRecipientMutation = useMutation({
    mutationFn: async (data: InsertDistributionForm) => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/distribution`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "distribution"] });
      setShowNewRecipient(false);
      form.reset();
      toast({
        title: "Recipient added",
        description: "The recipient has been added to the distribution list.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add recipient. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateDistributionMutation = useMutation({
    mutationFn: async ({ id, sentBool }: { id: string; sentBool: boolean }) => {
      // This would need to be implemented in the backend routes
      const response = await apiRequest("PUT", `/api/distribution/${id}`, { sentBool });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "distribution"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update distribution status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertDistributionForm) => {
    addRecipientMutation.mutate(data);
  };

  if (isLoading) {
    if (isEmbedded) {
      return (
        <div className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-brand-secondary">Distribution List</h3>
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

  const content = (
    <div className="p-6">
      {distribution.length === 0 ? (
        <div className="text-center py-8">
          <i className="fas fa-users text-3xl text-gray-400 mb-3"></i>
          <h3 className="text-base font-medium text-gray-900 mb-2">No recipients yet</h3>
          <p className="text-gray-500 mb-4 text-sm">Add recipients to distribute meeting minutes.</p>
          <Dialog open={showNewRecipient} onOpenChange={setShowNewRecipient}>
            <DialogTrigger asChild>
              <Button 
                className="bg-brand-secondary text-white hover:bg-brand-primary"
                data-testid="button-create-first-recipient"
              >
                Add Recipient
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Recipient</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recipient"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-recipient-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-recipient-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewRecipient(false)}
                        data-testid="button-cancel-recipient"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addRecipientMutation.isPending}
                        className="bg-brand-secondary text-white hover:bg-brand-primary"
                        data-testid="button-save-recipient"
                      >
                        {addRecipientMutation.isPending ? "Adding..." : "Add Recipient"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {distribution.map((recipient) => (
              <div key={recipient.id} className="flex items-center space-x-3 p-2 border border-gray-200 rounded" data-testid={`recipient-${recipient.id}`}>
                <Checkbox
                  checked={recipient.sentBool}
                  onCheckedChange={(checked) => 
                    updateDistributionMutation.mutate({ 
                      id: recipient.id, 
                      sentBool: checked as boolean 
                    })
                  }
                  className="w-4 h-4"
                  data-testid={`checkbox-recipient-${recipient.id}`}
                />
                <div className="flex-1">
                  <div className="font-medium text-sm text-gray-900">{recipient.recipient}</div>
                  <div className="text-xs text-gray-500">{recipient.email}</div>
                </div>
                <span className="text-xs">
                  {recipient.sentBool ? (
                    <i className="fas fa-check-circle text-green-600" data-testid={`status-sent-${recipient.id}`}></i>
                  ) : (
                    <i className="fas fa-clock text-gray-400" data-testid={`status-pending-${recipient.id}`}></i>
                  )}
                </span>
              </div>
            ))}
          </div>
          
          <Dialog open={showNewRecipient} onOpenChange={setShowNewRecipient}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                className="mt-4 text-brand-secondary hover:text-brand-primary"
                data-testid="button-add-recipient"
              >
                <i className="fas fa-plus mr-2"></i>
                Add Recipient
              </Button>
            </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Recipient</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="recipient"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-recipient-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-recipient-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewRecipient(false)}
                        data-testid="button-cancel-recipient"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={addRecipientMutation.isPending}
                        className="bg-brand-secondary text-white hover:bg-brand-primary"
                        data-testid="button-save-recipient"
                      >
                        {addRecipientMutation.isPending ? "Adding..." : "Add Recipient"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
        </>
      )}
    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
          <i className="fas fa-envelope"></i>
          <span>Distribution List</span>
        </h3>
      </div>
      {content}
    </div>
  );
}
