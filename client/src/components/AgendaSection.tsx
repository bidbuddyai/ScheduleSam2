import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { AgendaItem } from "@shared/schema";

interface AgendaSectionProps {
  meetingId: string;
}

export default function AgendaSection({ meetingId }: AgendaSectionProps) {
  const { toast } = useToast();
  const [expandedTopics, setExpandedTopics] = useState(3); // Show first 3 topics by default
  const [isCopying, setIsCopying] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const { data: agendaItems = [], isLoading } = useQuery<AgendaItem[]>({
    queryKey: ["/api/meetings", meetingId, "agenda"],
  });

  const updateAgendaMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<AgendaItem> }) => {
      const response = await apiRequest("PUT", `/api/agenda/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "agenda"] });
      toast({
        title: "Agenda updated",
        description: "The agenda item has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update agenda item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyFromLastMeetingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/copy-agenda`);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "agenda"] });
      toast({
        title: "Agenda copied",
        description: data.message || "Previous meeting's agenda has been copied.",
      });
      setIsCopying(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to copy agenda from last meeting.",
        variant: "destructive",
      });
      setIsCopying(false);
    },
  });

  const handleUpdate = (id: string, field: 'discussion' | 'decision', value: string) => {
    updateAgendaMutation.mutate({ id, updates: { [field]: value } });
  };

  const handleCopyFromLastMeeting = () => {
    if (confirm("This will copy decisions and discussions from the last meeting. Continue?")) {
      setIsCopying(true);
      copyFromLastMeetingMutation.mutate();
    }
  };

  const handleClearAgenda = () => {
    if (confirm("This will clear all discussions and decisions. The agenda structure will remain. Continue?")) {
      setIsClearing(true);
      const promises = agendaItems.map(item => {
        handleUpdate(item.id, 'discussion', '');
        handleUpdate(item.id, 'decision', '');
      });
      
      // Wait a bit for updates to complete
      setTimeout(() => {
        setIsClearing(false);
        toast({
          title: "Agenda cleared",
          description: "All discussions and decisions have been cleared.",
        });
      }, 1000);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-brand-secondary">Agenda & Minutes</h3>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayedItems = agendaItems.slice(0, expandedTopics);
  const remainingCount = agendaItems.length - expandedTopics;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
          <i className="fas fa-clipboard-list"></i>
          <span>Agenda & Minutes</span>
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyFromLastMeeting}
            disabled={isCopying || copyFromLastMeetingMutation.isPending}
            className="text-brand-secondary hover:text-brand-primary"
            data-testid="button-copy-last-agenda"
          >
            <i className="fas fa-copy mr-2"></i>
            {isCopying ? "Copying..." : "Copy from Last"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAgenda}
            disabled={isClearing}
            className="text-gray-600 hover:text-red-600"
            data-testid="button-clear-agenda"
          >
            <i className="fas fa-eraser mr-2"></i>
            {isClearing ? "Clearing..." : "Clear All"}
          </Button>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-6">
          {displayedItems.map((item) => (
            <div key={item.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  {item.topicOrder}. {item.title}
                </h4>
                <div className="flex items-center space-x-2">
                  {(item.discussion || item.decision) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Clear this agenda item's discussion and decision?")) {
                          handleUpdate(item.id, 'discussion', '');
                          handleUpdate(item.id, 'decision', '');
                        }
                      }}
                      className="text-gray-500 hover:text-red-600"
                      title="Clear this item"
                      data-testid={`button-clear-agenda-${item.id}`}
                    >
                      <i className="fas fa-times"></i>
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discussion</label>
                  <Textarea 
                    rows={4} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-brand-accent focus:border-brand-accent"
                    placeholder="Enter discussion points..."
                    defaultValue={item.discussion || ""}
                    onBlur={(e) => handleUpdate(item.id, 'discussion', e.target.value)}
                    data-testid={`textarea-discussion-${item.id}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Decision/Action</label>
                  <Textarea 
                    rows={4} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-brand-accent focus:border-brand-accent"
                    placeholder="Enter decisions and actions..."
                    defaultValue={item.decision || ""}
                    onBlur={(e) => handleUpdate(item.id, 'decision', e.target.value)}
                    data-testid={`textarea-decision-${item.id}`}
                  />
                </div>
              </div>
            </div>
          ))}

          {remainingCount > 0 && (
            <div className="text-center py-4">
              <Button
                variant="ghost"
                className="text-brand-secondary hover:text-brand-primary"
                onClick={() => setExpandedTopics(agendaItems.length)}
                data-testid="button-show-more-topics"
              >
                <span>Show {remainingCount} more topics</span>
                <i className="fas fa-chevron-down ml-2"></i>
              </Button>
            </div>
          )}

          {expandedTopics >= agendaItems.length && agendaItems.length > 3 && (
            <div className="text-center py-4">
              <Button
                variant="ghost"
                className="text-brand-secondary hover:text-brand-primary"
                onClick={() => setExpandedTopics(3)}
                data-testid="button-show-less-topics"
              >
                <span>Show less</span>
                <i className="fas fa-chevron-up ml-2"></i>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
