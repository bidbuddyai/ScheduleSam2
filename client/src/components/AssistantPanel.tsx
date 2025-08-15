import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AssistantPanelProps {
  meetingId: string;
}

interface AssistantResponse {
  tool?: {
    tool: string;
    args: Record<string, any>;
    speak?: string;
  };
  result?: any;
  speak?: string;
  response?: string;
}

export default function AssistantPanel({ meetingId }: AssistantPanelProps) {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [conversation, setConversation] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/ai/chat", {
        messages: [
          ...conversation.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
          })),
          { role: 'user', content: message }
        ],
        model: "gemini-2.5-pro"
      });
      return response.json();
    },
    onSuccess: (data: AssistantResponse) => {
      setConversation(prev => [
        ...prev,
        { type: 'user', content: query, timestamp: new Date() },
        { 
          type: 'assistant', 
          content: data.speak || data.response || 'Task completed successfully',
          timestamp: new Date() 
        }
      ]);
      
      if (data.tool) {
        toast({
          title: "AI Assistant",
          description: data.speak || `Executed ${data.tool.tool} successfully`,
        });
      }
      
      setQuery("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendQuery = () => {
    if (!query.trim()) return;
    chatMutation.mutate(query);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuery();
    }
  };

  const quickActions = [
    { label: "Generate action items", query: "Create action items from today's discussion points" },
    { label: "Summarize meeting", query: "Provide a summary of this meeting" },
    { label: "Create RFI", query: "Help me create a new RFI for the structural beam specifications" },
    { label: "Distribute minutes", query: "Distribute the meeting minutes to all attendees" }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
          <i className="fas fa-robot"></i>
          <span>Meeting Assistant</span>
          <span className="text-xs bg-brand-accent text-white px-2 py-1 rounded-full">AI Powered</span>
        </h3>
      </div>
      <div className="p-6">
        {/* Conversation History */}
        {conversation.length > 0 && (
          <div className="mb-6 max-h-64 overflow-y-auto">
            <div className="space-y-3">
              {conversation.map((message, index) => (
                <div 
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  data-testid={`message-${message.type}-${index}`}
                >
                  <div 
                    className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg text-sm ${
                      message.type === 'user' 
                        ? 'bg-brand-secondary text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ask the assistant to help with meeting tasks
            </label>
            <div className="flex space-x-2">
              <Input 
                type="text" 
                placeholder="e.g., 'Create action items from today's safety discussion' or 'Summarize this meeting'"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-brand-accent focus:border-brand-accent"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={chatMutation.isPending}
                data-testid="input-assistant-query"
              />
              <Button 
                className="bg-brand-accent text-white hover:bg-green-600"
                onClick={handleSendQuery}
                disabled={chatMutation.isPending || !query.trim()}
                data-testid="button-send-query"
              >
                {chatMutation.isPending ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-paper-plane"></i>
                )}
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="mt-2 flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <button 
                  key={index}
                  className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                  onClick={() => setQuery(action.query)}
                  disabled={chatMutation.isPending}
                  data-testid={`quick-action-${index}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Audio Controls */}
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline"
              className="text-gray-700 border-gray-300 hover:bg-gray-200 text-sm"
              data-testid="button-record-audio"
            >
              <i className="fas fa-microphone mr-2"></i>
              Record
            </Button>
            <Button 
              variant="outline"
              className="text-gray-700 border-gray-300 hover:bg-gray-200 text-sm"
              data-testid="button-upload-audio"
            >
              <i className="fas fa-upload mr-2"></i>
              Upload Audio
            </Button>
          </div>
        </div>

        {/* AI Status/Help */}
        {conversation.length === 0 && (
          <Card className="mt-4 bg-blue-50 border-blue-200">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <i className="fas fa-lightbulb text-blue-600 mt-1"></i>
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">AI Assistant Ready</h4>
                  <p className="text-sm text-blue-700">
                    I can help you create action items, summarize discussions, manage RFIs, and distribute meeting minutes. 
                    Try asking me to analyze your meeting content or use the quick action buttons above.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
