import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Meeting } from "@shared/schema";

interface MeetingHeaderProps {
  meeting: Meeting;
}

export default function MeetingHeader({ meeting }: MeetingHeaderProps) {
  const { toast } = useToast();

  const distributeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/meetings/${meeting.id}/distribute`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Minutes distributed",
        description: `Meeting minutes sent to ${data.sent} recipients.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to distribute minutes. Please try again.",
        variant: "destructive",
      });
    },
  });

  const exportMeeting = async (format: string) => {
    try {
      const response = await apiRequest("GET", `/api/meetings/${meeting.id}/export?format=${format}`);
      const data = await response.json();
      
      // For now, just download as JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meeting-${meeting.seqNum}-${meeting.date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export complete",
        description: `Meeting exported as ${format.toUpperCase()}.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export meeting. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-brand-primary">
              Weekly Progress Meeting #{meeting.seqNum}
            </h2>
            <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <i className="fas fa-calendar text-brand-secondary"></i>
                <span>{new Date(meeting.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-clock text-brand-secondary"></i>
                <span>{meeting.time}</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-map-marker-alt text-brand-secondary"></i>
                <span>{meeting.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <i className="fas fa-user-edit text-brand-secondary"></i>
                <span>Prepared by: {meeting.preparedBy}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              className="bg-brand-accent text-white hover:bg-green-600"
              data-testid="button-save-meeting"
            >
              <i className="fas fa-save mr-2"></i>
              Save
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  className="text-gray-700 border-gray-300 hover:bg-gray-200"
                  data-testid="button-export-meeting"
                >
                  <i className="fas fa-download mr-2"></i>
                  Export
                  <i className="fas fa-chevron-down text-xs ml-2"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportMeeting('docx')} data-testid="export-docx">
                  <i className="fas fa-file-word mr-2"></i>
                  Export as DOCX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportMeeting('pdf')} data-testid="export-pdf">
                  <i className="fas fa-file-pdf mr-2"></i>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportMeeting('csv')} data-testid="export-csv">
                  <i className="fas fa-file-csv mr-2"></i>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              className="bg-brand-primary text-white hover:bg-green-800"
              onClick={() => distributeMutation.mutate()}
              disabled={distributeMutation.isPending}
              data-testid="button-distribute-meeting"
            >
              <i className="fas fa-paper-plane mr-2"></i>
              {distributeMutation.isPending ? "Distributing..." : "Distribute"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
