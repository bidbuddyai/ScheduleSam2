import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Bookmark, BookmarkPlus, Calendar, Clock, 
  TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle, Trash2, Settings
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface BaselineManagerProps {
  projectId: string;
  onBaselineChange?: (baselineId: string | null) => void;
  selectedBaselineId?: string | null;
}

interface Baseline {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  snapshotData: any;
}

export default function BaselineManager({ projectId, onBaselineChange, selectedBaselineId }: BaselineManagerProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBaselineName, setNewBaselineName] = useState("");
  const [newBaselineDescription, setNewBaselineDescription] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: baselines = [], isLoading } = useQuery<Baseline[]>({
    queryKey: ['/api/projects', projectId, 'baselines'],
    refetchOnMount: true,
    staleTime: 0
  });

  const createBaselineMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isActive: boolean }) => {
      const response = await fetch(`/api/projects/${projectId}/baselines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'baselines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'activities'] });
      setIsCreateOpen(false);
      setNewBaselineName("");
      setNewBaselineDescription("");
      toast({
        title: "Baseline Created",
        description: "Schedule baseline has been captured successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create baseline. Please try again.",
        variant: "destructive"
      });
    }
  });

  const activateBaselineMutation = useMutation({
    mutationFn: async (baselineId: string) => {
      const response = await fetch(`/api/projects/${projectId}/baselines/${baselineId}/activate`, {
        method: 'POST'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'baselines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'activities'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'variance'] });
      toast({
        title: "Baseline Activated",
        description: "The selected baseline is now active for comparisons."
      });
    }
  });

  const deleteBaselineMutation = useMutation({
    mutationFn: async (baselineId: string) => {
      const response = await fetch(`/api/projects/${projectId}/baselines/${baselineId}`, {
        method: 'DELETE'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'baselines'] });
      toast({
        title: "Baseline Deleted",
        description: "Baseline has been removed successfully."
      });
    }
  });

  const handleCreateBaseline = () => {
    if (!newBaselineName.trim()) return;
    
    createBaselineMutation.mutate({
      name: newBaselineName,
      description: newBaselineDescription,
      isActive: baselines.length === 0 // Make first baseline active by default
    });
  };

  const activeBaseline = baselines.find(b => b.isActive);
  const totalBaselines = baselines.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bookmark className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Baseline Management</h3>
          <Badge variant="outline">{totalBaselines} Baseline{totalBaselines !== 1 ? 's' : ''}</Badge>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-baseline">
              <BookmarkPlus className="w-4 h-4 mr-2" />
              Save Baseline
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Schedule Baseline</DialogTitle>
              <DialogDescription>
                Capture the current schedule state as a baseline for variance tracking and performance analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="baseline-name">Baseline Name</Label>
                <Input
                  id="baseline-name"
                  value={newBaselineName}
                  onChange={(e) => setNewBaselineName(e.target.value)}
                  placeholder="e.g., Contract Baseline, Updated Baseline"
                  data-testid="input-baseline-name"
                />
              </div>
              <div>
                <Label htmlFor="baseline-description">Description (Optional)</Label>
                <Textarea
                  id="baseline-description"
                  value={newBaselineDescription}
                  onChange={(e) => setNewBaselineDescription(e.target.value)}
                  placeholder="Describe the purpose or context of this baseline..."
                  data-testid="textarea-baseline-description"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateBaseline}
                  disabled={!newBaselineName.trim() || createBaselineMutation.isPending}
                  data-testid="button-confirm-create-baseline"
                >
                  {createBaselineMutation.isPending ? "Creating..." : "Create Baseline"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Baseline Display */}
      {activeBaseline && (
        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800 dark:text-blue-200">Active Baseline</span>
            </div>
            <Badge className="bg-blue-600 hover:bg-blue-700">
              {activeBaseline.name}
            </Badge>
          </div>
          {activeBaseline.description && (
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
              {activeBaseline.description}
            </p>
          )}
          <div className="flex items-center space-x-4 mt-2 text-xs text-blue-600 dark:text-blue-400">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>Created {new Date(activeBaseline.createdAt).toLocaleDateString()}</span>
            </div>
            {activeBaseline.snapshotData && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{activeBaseline.snapshotData.totalActivities || 0} Activities</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Baseline Selection */}
      <div className="flex items-center space-x-4">
        <Label>Compare Against:</Label>
        <Select
          value={selectedBaselineId || (activeBaseline?.id || "")}
          onValueChange={onBaselineChange}
        >
          <SelectTrigger className="w-64" data-testid="select-baseline">
            <SelectValue placeholder="Select baseline for comparison" />
          </SelectTrigger>
          <SelectContent>
            {baselines.map(baseline => (
              <SelectItem key={baseline.id} value={baseline.id}>
                <div className="flex items-center space-x-2">
                  {baseline.isActive && <CheckCircle className="w-4 h-4 text-green-500" />}
                  <span>{baseline.name}</span>
                  {baseline.isActive && <Badge variant="secondary" className="text-xs">Active</Badge>}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Baseline List */}
      {baselines.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">All Baselines</h4>
          <div className="space-y-2">
            {baselines.map(baseline => (
              <div
                key={baseline.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  baseline.isActive 
                    ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
                    : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{baseline.name}</span>
                    {baseline.isActive && (
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    )}
                  </div>
                  {baseline.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {baseline.description}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(baseline.createdAt).toLocaleDateString()}</span>
                    </div>
                    {baseline.snapshotData && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{baseline.snapshotData.totalActivities || 0} Activities</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!baseline.isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activateBaselineMutation.mutate(baseline.id)}
                      disabled={activateBaselineMutation.isPending}
                      data-testid={`button-activate-baseline-${baseline.id}`}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Set Active
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteBaselineMutation.mutate(baseline.id)}
                    disabled={baseline.isActive || deleteBaselineMutation.isPending}
                    className="text-red-600 hover:text-red-700"
                    data-testid={`button-delete-baseline-${baseline.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {baselines.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No baselines created yet</p>
          <p className="text-sm">Create your first baseline to track schedule variance</p>
        </div>
      )}
    </div>
  );
}