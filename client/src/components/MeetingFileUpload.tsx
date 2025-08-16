import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Loader2, CheckCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { File as FileType } from "@shared/schema";

interface MeetingFileUploadProps {
  meetingId: string;
}

export default function MeetingFileUpload({ meetingId }: MeetingFileUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [processingFile, setProcessingFile] = useState(false);
  
  // Fetch existing files
  const { data: files = [], isLoading: filesLoading } = useQuery<FileType[]>({
    queryKey: ["/api/meetings", meetingId, "files"],
  });
  
  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (data: { uploadURL: string; fileName: string; fileType: string }) => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/files`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "files"] });
      toast({
        title: "File uploaded",
        description: "The file has been uploaded successfully.",
      });
    },
  });
  
  // Process file mutation (for AI extraction)
  const processFileMutation = useMutation({
    mutationFn: async (fileContent: string) => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/process-file`, {
        fileContent
      });
      return response.json();
    },
    onSuccess: (data) => {
      setProcessingFile(false);
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId] });
      toast({
        title: "File processed",
        description: `Extracted ${data.extracted?.actionItems?.length || 0} action items from the file.`,
      });
    },
    onError: () => {
      setProcessingFile(false);
      toast({
        title: "Processing failed",
        description: "Failed to process the file content.",
        variant: "destructive",
      });
    },
  });
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      // Get presigned upload URL
      const urlResponse = await apiRequest("POST", `/api/meetings/${meetingId}/files/upload-url`, {});
      const { uploadURL } = await urlResponse.json();
      
      // Upload file directly to object storage
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }
      
      // Store file record in database
      await uploadFileMutation.mutateAsync({
        uploadURL,
        fileName: file.name,
        fileType: file.type.startsWith("audio/") ? "Audio" : "Attachment"
      });
      
      // If it's a text file or PDF, process it for content extraction
      if (file.type === "text/plain" || file.type === "text/csv" || file.name.endsWith(".txt")) {
        setProcessingFile(true);
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          processFileMutation.mutate(content);
        };
        reader.readAsText(file);
      }
      
      setIsUploading(false);
    } catch (error) {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Meeting Files & Schedules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-sm text-gray-600 mb-3">
            Upload meeting recordings, schedules, or documents
          </p>
          <div className="flex justify-center">
            <label htmlFor="file-upload" className="cursor-pointer">
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading || processingFile}
                accept=".txt,.csv,.pdf,.mp3,.wav,.m4a"
              />
              <Button
                variant="outline"
                disabled={isUploading || processingFile}
                className="relative"
                asChild
              >
                <span>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : processingFile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>
        </div>
        
        {processingFile && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Analyzing file content to extract action items and key information...
            </AlertDescription>
          </Alert>
        )}
        
        {files.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Uploaded Files:</h4>
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{file.filename}</span>
                  <Badge variant="outline" className="text-xs">
                    {file.type}
                  </Badge>
                </div>
                {file.transcription && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Add missing Badge component if not already imported
import { Badge } from "@/components/ui/badge";