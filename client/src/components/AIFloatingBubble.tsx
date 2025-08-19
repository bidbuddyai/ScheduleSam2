import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  MessageCircle
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
}

// Available models from Poe's OpenAI-compatible API
const POE_MODELS = [
  { value: "GPT-5", label: "GPT-5 (Latest)", category: "GPT" },
  { value: "Claude-Sonnet-4", label: "Claude Sonnet 4 (Best)", category: "Claude" },
  { value: "Gemini-2.5-Pro", label: "Gemini 2.5 Pro (1M context)", category: "Google" },
  { value: "o3-pro", label: "o3 Pro (Reasoning)", category: "Reasoning" },
];

export default function AIFloatingBubble({ projectId }: AIFloatingBubbleProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState("generate");
  const [selectedModel, setSelectedModel] = useState("Claude-Sonnet-4");
  const [projectDescription, setProjectDescription] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [generatedActivities, setGeneratedActivities] = useState<Activity[]>([]);
  const [assistantQuery, setAssistantQuery] = useState("");
  const [conversation, setConversation] = useState<Array<{ role: string; content: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate schedule mutation
  const generateScheduleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/schedule/ai/generate", {
        type: "create",
        projectDescription,
        userRequest: projectDescription,
        model: selectedModel,
        uploadedFiles
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedActivities(data.activities || []);
      toast({
        title: "Schedule Generated",
        description: `AI created ${data.activities?.length || 0} activities`,
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assistant query mutation
  const assistantMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai/assistant", {
        query: assistantQuery,
        model: selectedModel,
        context: {
          projectId,
          currentActivities: generatedActivities
        }
      });
      return response.json();
    },
    onSuccess: (data) => {
      const newMessage = { role: "assistant", content: data.response || data.speak || "Response processed" };
      setConversation([...conversation, { role: "user", content: assistantQuery }, newMessage]);
      setAssistantQuery("");
    },
    onError: (error) => {
      toast({
        title: "Assistant Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Save activities mutation
  const saveActivitiesMutation = useMutation({
    mutationFn: async () => {
      const promises = generatedActivities.map(activity =>
        apiRequest("POST", `/api/projects/${projectId}/activities`, activity)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId, "activities"] });
      toast({
        title: "Activities Saved",
        description: `${generatedActivities.length} activities added to the project`,
      });
      setGeneratedActivities([]);
      setProjectDescription("");
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const supportedFormats = ['.pdf', '.mpp', '.xer', '.xml', '.xlsx', '.csv', '.txt'];
    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (supportedFormats.includes(ext)) {
        validFiles.push(file);
      } else {
        toast({
          title: "Unsupported File",
          description: `${file.name} is not a supported format. Supported: PDF, MPP, XER, XML, XLSX, CSV, TXT`,
          variant: "destructive",
        });
      }
    }

    if (validFiles.length > 0) {
      // Here you would upload to object storage and get URLs
      // For now, we'll just store the file names
      const fileNames = validFiles.map(f => f.name);
      setUploadedFiles([...uploadedFiles, ...fileNames]);
      toast({
        title: "Files Uploaded",
        description: `${validFiles.length} file(s) ready for analysis`,
      });
    }
  };

  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    const uploadedUrls = result.successful.map(file => file.uploadURL || "");
    setUploadedFiles([...uploadedFiles, ...uploadedUrls]);
    toast({
      title: "Files Uploaded",
      description: `${result.successful.length} file(s) ready for AI analysis`,
    });
  };

  return (
    <>
      {/* Floating Bubble */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Sparkles className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl h-[80vh] overflow-hidden p-0">
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">AI Schedule Assistant</h2>
                  <p className="text-sm text-gray-500">Powered by Poe API</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="w-full rounded-none border-b">
                  <TabsTrigger value="generate" className="flex-1">
                    <Calendar className="h-4 w-4 mr-2" />
                    Generate Schedule
                  </TabsTrigger>
                  <TabsTrigger value="import" className="flex-1">
                    <Upload className="h-4 w-4 mr-2" />
                    Import & Analyze
                  </TabsTrigger>
                  <TabsTrigger value="assistant" className="flex-1">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Chat Assistant
                  </TabsTrigger>
                </TabsList>

                <div className="h-[calc(100%-3rem)] overflow-y-auto p-6">
                  {/* Generate Tab */}
                  <TabsContent value="generate" className="space-y-4 mt-0">
                    <div className="space-y-4">
                      <div>
                        <Label>AI Model</Label>
                        <Select value={selectedModel} onValueChange={setSelectedModel}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {POE_MODELS.map(model => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Project Description</Label>
                        <Textarea
                          placeholder="Describe your project... e.g., '3-story office building demolition with hazmat abatement, 60 day duration, start January 2025'"
                          value={projectDescription}
                          onChange={(e) => setProjectDescription(e.target.value)}
                          className="min-h-[120px]"
                        />
                      </div>

                      <Button
                        onClick={() => generateScheduleMutation.mutate()}
                        disabled={!projectDescription || generateScheduleMutation.isPending}
                        className="w-full"
                      >
                        {generateScheduleMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Schedule with AI
                          </>
                        )}
                      </Button>

                      {generatedActivities.length > 0 && (
                        <div className="space-y-4">
                          <Alert>
                            <AlertDescription>
                              Generated {generatedActivities.length} activities. Review and save to project.
                            </AlertDescription>
                          </Alert>
                          
                          <div className="max-h-[300px] overflow-y-auto border rounded-lg">
                            <ScheduleEditor
                              activities={generatedActivities}
                              onActivitiesChange={setGeneratedActivities}
                            />
                          </div>

                          <Button
                            onClick={() => saveActivitiesMutation.mutate()}
                            disabled={saveActivitiesMutation.isPending}
                            className="w-full"
                          >
                            {saveActivitiesMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Save Activities to Project
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Import Tab */}
                  <TabsContent value="import" className="space-y-4 mt-0">
                    <div className="space-y-4">
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertDescription>
                          Upload project schedules (MPP, XER), specifications (PDF), or data files (XML, XLSX, CSV) for AI analysis and schedule generation.
                        </AlertDescription>
                      </Alert>

                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".pdf,.mpp,.xer,.xml,.xlsx,.csv,.txt"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        
                        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-sm text-gray-600 mb-4">
                          Drag and drop files here, or click to browse
                        </p>
                        
                        <ObjectUploader
                          maxNumberOfFiles={10}
                          maxFileSize={52428800} // 50MB
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handleUploadComplete}
                          buttonClassName="mx-auto"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Select Files
                        </ObjectUploader>
                        
                        <p className="text-xs text-gray-500 mt-4">
                          Supported: PDF, MPP, XER, XML, XLSX, CSV, TXT (Max 50MB)
                        </p>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label>Uploaded Files ({uploadedFiles.length})</Label>
                          <div className="border rounded-lg p-2 max-h-[150px] overflow-y-auto">
                            {uploadedFiles.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 py-1">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span className="text-sm truncate">{file}</span>
                              </div>
                            ))}
                          </div>
                          
                          <Button
                            onClick={() => generateScheduleMutation.mutate()}
                            disabled={generateScheduleMutation.isPending}
                            className="w-full"
                          >
                            {generateScheduleMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Analyzing Files...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                Analyze & Generate Schedule
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Assistant Tab */}
                  <TabsContent value="assistant" className="space-y-4 mt-0">
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 h-[400px] overflow-y-auto bg-gray-50">
                        {conversation.length === 0 ? (
                          <div className="text-center text-gray-500 mt-8">
                            <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>Ask me anything about scheduling, CPM, or your project!</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {conversation.map((msg, index) => (
                              <div
                                key={index}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                    msg.role === "user"
                                      ? "bg-blue-600 text-white"
                                      : "bg-white border"
                                  }`}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Ask about CPM, scheduling, or get help with your project..."
                          value={assistantQuery}
                          onChange={(e) => setAssistantQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              assistantMutation.mutate();
                            }
                          }}
                          className="flex-1 min-h-[60px]"
                        />
                        <Button
                          onClick={() => assistantMutation.mutate()}
                          disabled={!assistantQuery || assistantMutation.isPending}
                          size="icon"
                          className="h-[60px] w-[60px]"
                        >
                          {assistantMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}