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

  const handleUpdate = (id: string, field: 'discussion' | 'decision', value: string) => {
    updateAgendaMutation.mutate({ id, updates: { [field]: value } });
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
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
          <i className="fas fa-clipboard-list"></i>
          <span>Agenda & Minutes</span>
        </h3>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-brand-secondary hover:text-brand-primary"
                    data-testid={`button-edit-agenda-${item.id}`}
                  >
                    <i className="fas fa-edit"></i>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Discussion</label>
                  <Textarea 
                    rows={4} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-brand-accent focus:border-brand-accent"
                    placeholder="Enter discussion points..."
                    value={item.discussion || ""}
                    onChange={(e) => handleUpdate(item.id, 'discussion', e.target.value)}
                    data-testid={`textarea-discussion-${item.id}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Decision/Action</label>
                  <Textarea 
                    rows={4} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-brand-accent focus:border-brand-accent"
                    placeholder="Enter decisions and actions..."
                    value={item.decision || ""}
                    onChange={(e) => handleUpdate(item.id, 'decision', e.target.value)}
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
