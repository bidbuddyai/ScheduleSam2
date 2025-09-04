import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Sparkles, 
  Bot, 
  X, 
  Upload, 
  FileText, 
  Loader2, 
  Send,
  Minimize2,
  Maximize2,
  Calendar,
  GitBranch,
  Download,
  MessageCircle,
  AlertCircle,
  CheckCircle,
  Link2,
  Info,
  User,
  RefreshCw,
  Wand2,
  Clock
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "./ObjectUploader";
import type { UploadResult } from "@uppy/core";
import ScheduleEditor, { type Activity } from "./ScheduleEditor";
import { motion, AnimatePresence } from "framer-motion";

interface AIFloatingBubbleProps {
  projectId: string;
  defaultOpen?: boolean;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  activities?: Activity[];
  metadata?: {
    activitiesGenerated?: number;
    relationshipsCreated?: number;
    criticalPath?: string[];
    contractDuration?: number;
    extractedDates?: { start?: string; end?: string };
  };
}

// Available models from Poe's OpenAI-compatible API
const POE_MODELS = [
  // Claude Models
  { value: "Claude-Sonnet-4", label: "Claude Sonnet 4 (Best Overall)", category: "Claude" },
  { value: "Claude-3-Haiku", label: "Claude 3 Haiku (Fast)", category: "Claude" },
  { value: "Claude-3-Opus", label: "Claude 3 Opus (Advanced)", category: "Claude" },
  { value: "Claude-3.5-Sonnet", label: "Claude 3.5 Sonnet", category: "Claude" },
  
  // GPT Models
  { value: "GPT-5", label: "GPT-5 (Latest)", category: "GPT" },
  { value: "GPT-4o", label: "GPT-4o (Optimized)", category: "GPT" },
  { value: "GPT-4-Turbo", label: "GPT-4 Turbo", category: "GPT" },
  { value: "GPT-3.5-Turbo", label: "GPT-3.5 Turbo (Fast)", category: "GPT" },
  
  // Google Models
  { value: "Gemini-2.5-Pro", label: "Gemini 2.5 Pro (1M context)", category: "Google" },
  { value: "Gemini-1.5-Pro", label: "Gemini 1.5 Pro", category: "Google" },
  { value: "Gemini-Pro", label: "Gemini Pro", category: "Google" },
  
  // Reasoning Models
  { value: "o3-pro", label: "o3 Pro (Advanced Reasoning)", category: "Reasoning" },
  { value: "o1-preview", label: "o1 Preview (Reasoning)", category: "Reasoning" },
  { value: "o1-mini", label: "o1 Mini (Fast Reasoning)", category: "Reasoning" },
  
  // Other Models
  { value: "Grok-4", label: "Grok 4 (xAI)", category: "Other" },
  { value: "Llama-3.1-405B", label: "Llama 3.1 405B", category: "Other" },
  { value: "Llama-3.1-70B", label: "Llama 3.1 70B", category: "Other" },
  { value: "Mixtral-8x7B", label: "Mixtral 8x7B", category: "Other" },
  { value: "DeepSeek-V3", label: "DeepSeek V3", category: "Other" },
];

export default function AIFloatingBubble({ projectId, defaultOpen = false }: AIFloatingBubbleProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedModel, setSelectedModel] = useState("Claude-Sonnet-4");
  const [projectDescription, setProjectDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [generatedActivities, setGeneratedActivities] = useState<Activity[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-open when defaultOpen is true (from project creation)
  useEffect(() => {
    if (defaultOpen) {
      setIsOpen(true);
    }
  }, [defaultOpen]);

  // Scroll to bottom when new messages are added
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: async (request: { message: string; isInitial?: boolean }) => {
      try {
        console.log("Starting schedule generation...");
        const response = await apiRequest("POST", "/api/schedule/ai/generate", {
          type: request.isInitial ? "create" : "update",
          projectDescription: request.message,
          userRequest: request.message,
          model: selectedModel,
          projectId: projectId, // Essential for saving changes!
          uploadedFiles,
          currentActivities: generatedActivities
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server error:", errorText);
          throw new Error("Failed to generate schedule - server error");
        }
        
        const data = await response.json();
        console.log("Received data:", data);
        return data;
      } catch (error) {
        console.error("Generation error:", error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      if (data && data.activities && data.activities.length > 0) {
        // Add assistant response to chat
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: generateAssistantResponse(data, variables.isInitial),
          timestamp: new Date(),
          activities: data.activities,
          metadata: {
            activitiesGenerated: data.activities.length,
            relationshipsCreated: countRelationships(data.activities),
            criticalPath: data.criticalPath,
            contractDuration: calculateDuration(data.activities),
            extractedDates: extractDates(data.activities)
          }
        };
        
        setChatHistory(prev => [...prev, assistantMessage]);
        setGeneratedActivities(data.activities);
        
        if (data.saved) {
          queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activities"] });
          queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "relationships"] });
          toast({
            title: "Schedule Updated",
            description: `${data.activities.length} activities with ${countRelationships(data.activities)} relationships saved to project.`,
          });
        }
      }
    },
    onError: (error) => {
      console.error("Schedule generation failed:", error);
      const errorMessage: ChatMessage = {
        role: "system",
        content: "Failed to generate schedule. Please check your API key and try again.",
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate schedule",
        variant: "destructive"
      });
    }
  });

  // Helper functions
  const countRelationships = (activities: Activity[]) => {
    return activities.reduce((count, act) => 
      count + (act.predecessors?.length || 0), 0
    );
  };

  const calculateDuration = (activities: Activity[]) => {
    if (!activities.length) return 0;
    const firstDate = activities[0]?.earlyStart ? new Date(activities[0].earlyStart) : new Date();
    let lastDate = firstDate;
    
    activities.forEach(act => {
      if (act.earlyFinish) {
        const finish = new Date(act.earlyFinish);
        if (finish > lastDate) lastDate = finish;
      }
    });
    
    return Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const extractDates = (activities: Activity[]) => {
    const dates: { start?: string; end?: string } = {};
    if (activities.length > 0) {
      dates.start = activities[0]?.earlyStart || undefined;
      let lastDate = dates.start;
      activities.forEach(act => {
        if (act.earlyFinish && (!lastDate || act.earlyFinish > lastDate)) {
          lastDate = act.earlyFinish;
        }
      });
      dates.end = lastDate;
    }
    return dates;
  };

  const generateAssistantResponse = (data: any, isInitial?: boolean) => {
    const meta = {
      activities: data.activities.length,
      relationships: countRelationships(data.activities),
      duration: calculateDuration(data.activities),
      criticalActivities: data.activities.filter((a: Activity) => a.isCritical).length
    };

    if (isInitial) {
      return `✅ **Schedule Generated Successfully!**

I've created a comprehensive CPM schedule with:
• **${meta.activities} activities** organized in logical sequence
• **${meta.relationships} dependency relationships** connecting activities
• **${meta.duration} days** total project duration
• **${meta.criticalActivities} critical path activities** identified

**Key Features Applied:**
${data.activities[0]?.constraintType ? '• Constraints applied based on project requirements' : ''}
${uploadedFiles.length > 0 ? '• Extracted information from uploaded documents' : ''}
${data.criticalPath ? `• Critical path: ${data.criticalPath.slice(0, 5).join(' → ')}${data.criticalPath.length > 5 ? '...' : ''}` : ''}

**Work Breakdown Structure:**
${generateWBSSummary(data.activities)}

**Next Steps:**
You can now:
- Ask me to modify specific activities
- Add constraints or milestones
- Adjust durations or dependencies
- Export the schedule

What would you like to adjust?`;
    } else {
      return `✅ **Schedule Updated!**

Changes applied:
• Modified ${meta.activities} activities
• Updated relationships and dependencies
• Recalculated critical path

The schedule now reflects your requested changes. What else would you like to modify?`;
    }
  };

  const generateWBSSummary = (activities: Activity[]) => {
    const wbsGroups: { [key: string]: number } = {};
    activities.forEach(act => {
      const wbs = act.wbs?.split('.')[0] || '1';
      wbsGroups[wbs] = (wbsGroups[wbs] || 0) + 1;
    });
    
    return Object.entries(wbsGroups)
      .slice(0, 5)
      .map(([wbs, count]) => `• Phase ${wbs}: ${count} activities`)
      .join('\n');
  };

  // Enhance prompt using a fast AI model
  const enhancePrompt = async () => {
    if (!chatInput.trim() || isEnhancing) return;
    
    setIsEnhancing(true);
    try {
      const response = await apiRequest("POST", "/api/schedule/ai/enhance-prompt", {
        prompt: chatInput,
        model: "Claude-3-Haiku", // Fast and cheap model for enhancement
        uploadedFiles: uploadedFiles // Pass uploaded files context for better enhancement
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.enhancedPrompt) {
          setChatInput(data.enhancedPrompt);
          toast({
            title: "Prompt Enhanced",
            description: "Your prompt has been improved for better results",
          });
        }
      }
    } catch (error) {
      console.error("Failed to enhance prompt:", error);
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance prompt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  // Enhance prompt for Quick Generate tab
  const enhanceQuickPrompt = async () => {
    if (!projectDescription.trim() || isEnhancing) return;
    
    setIsEnhancing(true);
    try {
      const response = await apiRequest("POST", "/api/schedule/ai/enhance-prompt", {
        prompt: projectDescription,
        model: "Claude-3-Haiku",
        uploadedFiles: uploadedFiles
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.enhancedPrompt) {
          setProjectDescription(data.enhancedPrompt);
          toast({
            title: "Prompt Enhanced",
            description: "Your prompt has been improved with CPM details",
          });
        }
      }
    } catch (error) {
      console.error("Failed to enhance prompt:", error);
      toast({
        title: "Enhancement Failed",
        description: "Could not enhance prompt. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEnhancing(false);
    }
  };
  
  const handleSendMessage = () => {
    if (!chatInput.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput,
      timestamp: new Date()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput("");
    setIsGenerating(true);

    generateScheduleMutation.mutate(
      { 
        message: chatInput, 
        isInitial: chatHistory.length === 0 
      },
      {
        onSettled: () => setIsGenerating(false)
      }
    );
  };

  const handleFileUpload = (result: UploadResult) => {
    const newFiles = result.successful.map(file => 
      file.response?.uploadURL || file.response?.url || ''
    ).filter(Boolean);
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
    
    // Add system message about file upload
    const fileMessage: ChatMessage = {
      role: "system",
      content: `📎 Uploaded ${result.successful.length} file(s). The AI will analyze these documents when generating the schedule.`,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, fileMessage]);
  };

  const handleQuickAction = (action: string) => {
    setChattInput(action);
    handleSendMessage();
  };

  const clearChat = () => {
    setChatHistory([]);
    setGeneratedActivities([]);
    setUploadedFiles([]);
  };

  return (
    <TooltipProvider>
      {/* Floating Bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsOpen(true)}
                  size="lg"
                  className="rounded-full w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-xl hover:shadow-2xl transition-all"
                  data-testid="button-ai-bubble"
                >
                  <Sparkles className="w-8 h-8" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>AI Schedule Assistant - Edit and refine your schedule</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className={`${isMinimized ? 'w-96' : 'w-[90vw] max-w-6xl'} h-[85vh] flex flex-col p-0`}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-600 to-blue-600 text-white">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6" />
              <div>
                <DialogTitle className="text-lg font-semibold text-white">
                  Schedule AI Assistant
                </DialogTitle>
                <DialogDescription className="text-sm text-purple-100">
                  Interactive CPM scheduling powered by AI
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="w-full justify-start px-6 py-6 bg-gray-50 rounded-none">
                <TabsTrigger value="chat" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Interactive Chat
                </TabsTrigger>
                <TabsTrigger value="generate" className="gap-2">
                  <Calendar className="w-4 h-4" />
                  Quick Generate
                </TabsTrigger>
                <TabsTrigger value="files" className="gap-2">
                  <Upload className="w-4 h-4" />
                  Documents
                  {uploadedFiles.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {uploadedFiles.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="preview" className="gap-2" disabled={generatedActivities.length === 0}>
                  <GitBranch className="w-4 h-4" />
                  Preview
                  {generatedActivities.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {generatedActivities.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* Chat Tab */}
              <TabsContent value="chat" className="h-[calc(100%-60px)] p-0">
                <div className="flex flex-col h-full">
                  <Alert className="mx-6 mt-4 mb-2 bg-blue-50 border-blue-200">
                    <MessageCircle className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-sm">
                      <strong>Interactive Chat:</strong> Have a conversation with AI to iteratively refine your schedule. Ask questions, request changes, and build step-by-step.
                    </AlertDescription>
                  </Alert>
                  
                  {/* Model Selector */}
                  <div className="px-6 py-3 border-b bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">AI Model:</Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger className="w-48 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {POE_MODELS.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearChat}
                        className="text-gray-600"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Clear Chat
                      </Button>
                    </div>
                  </div>

                  {/* Chat Messages */}
                  <ScrollArea className="flex-1 px-6 py-4" ref={chatScrollRef}>
                    {chatHistory.length === 0 ? (
                      <div className="text-center py-12">
                        <Bot className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <h3 className="text-lg font-medium mb-2">Start a Conversation</h3>
                        <p className="text-gray-500 mb-6">
                          I'll help create your CPM schedule. I can ask questions to gather details.
                        </p>
                        
                        {/* Smart Questions */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg max-w-md mx-auto">
                          <p className="text-sm font-medium mb-3">Let me know about your project:</p>
                          <div className="space-y-2 text-left">
                            <button 
                              onClick={() => handleQuickAction("What type of construction project is this? When is the planned start date?")}
                              className="w-full text-left text-sm p-2 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <Calendar className="w-4 h-4 text-gray-400" />
                              Tell me project type & start date
                            </button>
                            <button 
                              onClick={() => handleQuickAction("What's the contract duration? Are there any milestone dates I should know about?")}
                              className="w-full text-left text-sm p-2 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <Clock className="w-4 h-4 text-gray-400" />
                              Contract duration & milestones
                            </button>
                            <button 
                              onClick={() => handleQuickAction("What are the major phases or work packages for this project?")}
                              className="w-full text-left text-sm p-2 hover:bg-gray-100 rounded flex items-center gap-2"
                            >
                              <GitBranch className="w-4 h-4 text-gray-400" />
                              Major phases & work packages
                            </button>
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                          <Button
                            variant="outline"
                            className="text-sm"
                            onClick={() => handleQuickAction("Create a 6-month commercial construction schedule with all trades")}
                          >
                            Commercial Building
                          </Button>
                          <Button
                            variant="outline"
                            className="text-sm"
                            onClick={() => handleQuickAction("Generate residential home construction schedule, 4 bedroom house")}
                          >
                            Residential Home
                          </Button>
                          <Button
                            variant="outline"
                            className="text-sm"
                            onClick={() => handleQuickAction("Create infrastructure project schedule for road construction")}
                          >
                            Infrastructure
                          </Button>
                          <Button
                            variant="outline"
                            className="text-sm"
                            onClick={() => handleQuickAction("Generate renovation schedule for office building modernization")}
                          >
                            Renovation
                          </Button>
                        </div>
                        
                        <div className="mt-6 p-4 bg-purple-50 rounded-lg max-w-md mx-auto">
                          <Info className="w-5 h-5 text-purple-600 mb-2 mx-auto" />
                          <p className="text-sm text-purple-900">
                            <strong>Pro Tip:</strong> Use this dialog for initial schedule creation.
                            After generation, use the floating button (bottom right) for edits and refinements.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatHistory.map((message, idx) => (
                          <div
                            key={idx}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-4 ${
                                message.role === 'user'
                                  ? 'bg-purple-600 text-white'
                                  : message.role === 'assistant'
                                  ? 'bg-gray-100'
                                  : 'bg-blue-50 border border-blue-200'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                {message.role === 'assistant' && <Bot className="w-5 h-5 mt-0.5" />}
                                {message.role === 'user' && <User className="w-5 h-5 mt-0.5" />}
                                {message.role === 'system' && <Info className="w-5 h-5 mt-0.5 text-blue-600" />}
                                <div className="flex-1">
                                  <div className="text-sm whitespace-pre-wrap">
                                    {message.content}
                                  </div>
                                  
                                  {/* Metadata Display */}
                                  {message.metadata && (
                                    <div className="mt-3 pt-3 border-t space-y-2">
                                      <div className="flex flex-wrap gap-2">
                                        {message.metadata.activitiesGenerated && (
                                          <Badge variant="outline">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {message.metadata.activitiesGenerated} activities
                                          </Badge>
                                        )}
                                        {message.metadata.relationshipsCreated && (
                                          <Badge variant="outline">
                                            <Link2 className="w-3 h-3 mr-1" />
                                            {message.metadata.relationshipsCreated} links
                                          </Badge>
                                        )}
                                        {message.metadata.contractDuration && (
                                          <Badge variant="outline">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {message.metadata.contractDuration} days
                                          </Badge>
                                        )}
                                      </div>
                                      {message.metadata.extractedDates?.start && (
                                        <div className="text-xs text-gray-600">
                                          Schedule: {message.metadata.extractedDates.start} to {message.metadata.extractedDates.end}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-400 mt-2">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        {isGenerating && (
                          <div className="flex justify-start">
                            <div className="bg-gray-100 rounded-lg p-4">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Generating schedule...</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ScrollArea>

                  {/* Chat Input */}
                  <div 
                    className="relative px-6 py-4 border-t bg-gray-50"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const files = Array.from(e.dataTransfer.files);
                      if (files.length > 0) {
                        setUploadedFiles(prev => [...prev, ...files.map(f => f.name)]);
                        toast({
                          title: "Files Dropped",
                          description: `${files.length} file(s) will be analyzed by AI`,
                        });
                      }
                    }}
                  >
                    {isDragOver && (
                      <div className="absolute inset-0 bg-purple-50 border-2 border-dashed border-purple-500 rounded-lg z-10 flex items-center justify-center">
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                          <p className="text-purple-600 font-medium">Drop files here</p>
                          <p className="text-sm text-purple-500">Multiple files supported</p>
                        </div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-2">
                        <Textarea
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Describe your project or ask for changes..."
                          className="min-h-[80px] resize-none"
                          disabled={isGenerating || isEnhancing}
                        />
                        {chatInput.trim() && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={enhancePrompt}
                                disabled={isEnhancing || isGenerating}
                                className="w-full justify-start text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              >
                                {isEnhancing ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Enhancing...
                                  </>
                                ) : (
                                  <>
                                    <Wand2 className="w-4 h-4 mr-2" />
                                    Enhance Prompt with AI
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-sm">
                                Uses AI to improve your prompt with more details, better structure, and specific requirements for optimal schedule generation
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleSendMessage}
                          disabled={!chatInput.trim() || isGenerating || isEnhancing}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {uploadedFiles.map((file, idx) => (
                          <Badge key={idx} variant="secondary">
                            <FileText className="w-3 h-3 mr-1" />
                            Document {idx + 1}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Quick Generate Tab */}
              <TabsContent value="generate" className="px-6 py-4">
                <div className="space-y-4">
                  <Alert className="bg-purple-50 border-purple-200">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <AlertDescription className="text-sm">
                      <strong>Quick Generate:</strong> Describe your project once and instantly create a complete CPM schedule. Perfect for initial schedule creation.
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <Label>Project Description</Label>
                    <Textarea
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      placeholder="Example: 10-story office building, 365 day contract, includes site work, foundations, structure, MEP, and finishes..."
                      className="min-h-[150px] mt-2"
                    />
                    
                    {/* Enhance Button for Quick Generate */}
                    {projectDescription.trim() && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={enhanceQuickPrompt}
                            disabled={isEnhancing || generateScheduleMutation.isPending}
                            className="w-full mt-2 justify-start text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          >
                            {isEnhancing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Enhancing...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4 mr-2" />
                                Enhance Prompt with AI
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-sm">
                            Uses AI to improve your prompt with CPM details, durations, and constraints
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  
                  {/* File Upload Section */}
                  <div>
                    <Label className="mb-2">Upload Documents (Optional)</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                        isDragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
                      }`}
                    >
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 0) {
                              setUploadedFiles(prev => [...prev, ...files.map(f => f.name)]);
                              toast({
                                title: "Files Selected",
                                description: `${files.length} file(s) will be analyzed by AI when generating the schedule`,
                              });
                            }
                          }}
                          className="hidden"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Choose Files (Multiple Allowed)
                        </Button>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        Upload bid documents, specs, or drawings for AI to extract contract duration and scope
                      </p>
                      
                      {uploadedFiles.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 justify-center">
                          {uploadedFiles.map((file, idx) => (
                            <Badge key={idx} variant="secondary">
                              <FileText className="w-3 h-3 mr-1" />
                              Document {idx + 1}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => {
                      if (projectDescription) {
                        setActiveTab("chat");
                        setChattInput(projectDescription);
                        handleSendMessage();
                      }
                    }}
                    disabled={!projectDescription.trim() || generateScheduleMutation.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-700"
                  >
                    {generateScheduleMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Schedule...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Schedule
                      </>
                    )}
                  </Button>
                  
                  <div className="text-xs text-gray-500 text-center">
                    Tip: Upload bid documents to extract contract duration and milestones automatically
                  </div>
                </div>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="px-6 py-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center ${
                    isDragOver ? 'border-purple-500 bg-purple-50' : 'border-gray-300'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                  }}
                >
                  <ObjectUploader
                    onUploadComplete={handleFileUpload}
                    projectId={projectId}
                    folder="schedule-docs"
                  />
                  
                  {uploadedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {uploadedFiles.map((file, idx) => (
                        <Alert key={idx}>
                          <FileText className="w-4 h-4" />
                          <AlertDescription>
                            Document {idx + 1} uploaded successfully
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.csv,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    // Handle file selection
                  }}
                />
              </TabsContent>

              {/* Preview Tab */}
              <TabsContent value="preview" className="px-6 py-4">
                {generatedActivities.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">
                        Generated Schedule ({generatedActivities.length} activities)
                      </h3>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          <Link2 className="w-3 h-3 mr-1" />
                          {countRelationships(generatedActivities)} relationships
                        </Badge>
                        <Badge variant="outline">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {generatedActivities.filter(a => a.isCritical).length} critical
                        </Badge>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[400px]">
                      <ScheduleEditor 
                        activities={generatedActivities} 
                        onActivitiesChange={setGeneratedActivities}
                      />
                    </ScrollArea>
                    
                    <Alert>
                      <CheckCircle className="w-4 h-4" />
                      <AlertDescription>
                        Schedule has been saved to your project. View in the Schedule tab to see the Gantt chart with relationship arrows.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">
                      No schedule generated yet. Start a conversation to create one.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}