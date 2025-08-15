import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRfiSchema, insertSubmittalSchema, insertFabricationSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Rfi, Submittal, Fabrication } from "@shared/schema";
import type { z } from "zod";

type InsertRfiForm = z.infer<typeof insertRfiSchema>;
type InsertSubmittalForm = z.infer<typeof insertSubmittalSchema>;
type InsertFabricationForm = z.infer<typeof insertFabricationSchema>;

interface TabbedSectionProps {
  meetingId: string;
}

export default function TabbedSection({ meetingId }: TabbedSectionProps) {
  const { toast } = useToast();
  const [showNewRfi, setShowNewRfi] = useState(false);
  const [showNewSubmittal, setShowNewSubmittal] = useState(false);
  const [showNewFabrication, setShowNewFabrication] = useState(false);

  const { data: rfis = [], isLoading: rfisLoading } = useQuery<Rfi[]>({
    queryKey: ["/api/meetings", meetingId, "rfis"],
  });

  const { data: submittals = [], isLoading: submittalsLoading } = useQuery<Submittal[]>({
    queryKey: ["/api/meetings", meetingId, "submittals"],
  });

  const { data: fabrication = [], isLoading: fabricationLoading } = useQuery<Fabrication[]>({
    queryKey: ["/api/meetings", meetingId, "fabrication"],
  });

  const rfiForm = useForm<InsertRfiForm>({
    resolver: zodResolver(insertRfiSchema.omit({ meetingId: true })),
    defaultValues: {
      number: "",
      title: "",
      submittedDate: "",
      responseDue: "",
      status: "Pending",
      impact: "",
      owner: "",
      ballInCourt: "",
      notes: ""
    }
  });

  const submittalForm = useForm<InsertSubmittalForm>({
    resolver: zodResolver(insertSubmittalSchema.omit({ meetingId: true })),
    defaultValues: {
      number: "",
      title: "",
      specSection: "",
      requiredDate: "",
      submittedDate: "",
      reviewStatus: "Pending",
      resubmittalNeededBool: false,
      owner: "",
      ballInCourt: ""
    }
  });

  const fabricationForm = useForm<InsertFabricationForm>({
    resolver: zodResolver(insertFabricationSchema.omit({ meetingId: true })),
    defaultValues: {
      component: "",
      vendor: "",
      fabStart: "",
      fabFinish: "",
      shipDate: "",
      needBy: "",
      risks: "",
      owner: "",
      ballInCourt: ""
    }
  });

  const createRfiMutation = useMutation({
    mutationFn: async (data: InsertRfiForm) => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/rfis`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "rfis"] });
      setShowNewRfi(false);
      rfiForm.reset();
      toast({
        title: "RFI created",
        description: "The RFI has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create RFI. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createSubmittalMutation = useMutation({
    mutationFn: async (data: InsertSubmittalForm) => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/submittals`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "submittals"] });
      setShowNewSubmittal(false);
      submittalForm.reset();
      toast({
        title: "Submittal created",
        description: "The submittal has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create submittal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createFabricationMutation = useMutation({
    mutationFn: async (data: InsertFabricationForm) => {
      const response = await apiRequest("POST", `/api/meetings/${meetingId}/fabrication`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meetings", meetingId, "fabrication"] });
      setShowNewFabrication(false);
      fabricationForm.reset();
      toast({
        title: "Fabrication item created",
        description: "The fabrication item has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create fabrication item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (rfisLoading || submittalsLoading || fabricationLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            <div className="py-4 px-1 border-b-2 border-brand-accent">
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
      <Tabs defaultValue="rfis" className="w-full">
        <div className="border-b border-gray-200">
          <TabsList className="grid w-full grid-cols-3 bg-transparent h-auto p-0">
            <TabsTrigger 
              value="rfis" 
              className="py-4 px-6 border-b-2 border-transparent data-[state=active]:border-brand-accent data-[state=active]:text-brand-secondary font-medium text-sm rounded-none bg-transparent"
              data-testid="tab-rfis"
            >
              RFIs ({rfis.length})
            </TabsTrigger>
            <TabsTrigger 
              value="submittals" 
              className="py-4 px-6 border-b-2 border-transparent data-[state=active]:border-brand-accent data-[state=active]:text-brand-secondary font-medium text-sm rounded-none bg-transparent"
              data-testid="tab-submittals"
            >
              Submittals ({submittals.length})
            </TabsTrigger>
            <TabsTrigger 
              value="fabrication" 
              className="py-4 px-6 border-b-2 border-transparent data-[state=active]:border-brand-accent data-[state=active]:text-brand-secondary font-medium text-sm rounded-none bg-transparent"
              data-testid="tab-fabrication"
            >
              Fabrication ({fabrication.length})
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="rfis" className="p-6 mt-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-brand-secondary">Request for Information (RFI)</h3>
            <Dialog open={showNewRfi} onOpenChange={setShowNewRfi}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-brand-secondary text-white hover:bg-brand-primary"
                  data-testid="button-new-rfi"
                >
                  <i className="fas fa-plus mr-2"></i>
                  New RFI
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New RFI</DialogTitle>
                </DialogHeader>
                <Form {...rfiForm}>
                  <form onSubmit={rfiForm.handleSubmit((data) => createRfiMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={rfiForm.control}
                        name="number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>RFI Number</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-rfi-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={rfiForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-rfi-status">
                                  <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Resolved">Resolved</SelectItem>
                                <SelectItem value="Closed">Closed</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={rfiForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-rfi-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={rfiForm.control}
                        name="submittedDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Submitted Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} data-testid="input-rfi-submitted-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={rfiForm.control}
                        name="responseDue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Response Due</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} data-testid="input-rfi-response-due" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={rfiForm.control}
                        name="owner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-rfi-owner" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={rfiForm.control}
                        name="ballInCourt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ball in Court</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-rfi-ball-in-court" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={rfiForm.control}
                      name="impact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Impact</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} data-testid="textarea-rfi-impact" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={rfiForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} data-testid="textarea-rfi-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewRfi(false)}
                        data-testid="button-cancel-rfi"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createRfiMutation.isPending}
                        className="bg-brand-secondary text-white hover:bg-brand-primary"
                        data-testid="button-create-rfi"
                      >
                        {createRfiMutation.isPending ? "Creating..." : "Create RFI"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">RFI #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rfis.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No RFIs found. Create your first RFI to get started.
                    </td>
                  </tr>
                ) : (
                  rfis.map((rfi) => (
                    <tr key={rfi.id} data-testid={`row-rfi-${rfi.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rfi.number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{rfi.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rfi.submittedDate ? new Date(rfi.submittedDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {rfi.responseDue ? new Date(rfi.responseDue).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(rfi.status)}`}>
                          {rfi.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rfi.owner}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-brand-secondary hover:text-brand-primary mr-3" data-testid={`button-edit-rfi-${rfi.id}`}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="text-red-600 hover:text-red-900" data-testid={`button-delete-rfi-${rfi.id}`}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="submittals" className="p-6 mt-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-brand-secondary">Submittals</h3>
            <Dialog open={showNewSubmittal} onOpenChange={setShowNewSubmittal}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-brand-secondary text-white hover:bg-brand-primary"
                  data-testid="button-new-submittal"
                >
                  <i className="fas fa-plus mr-2"></i>
                  New Submittal
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Submittal</DialogTitle>
                </DialogHeader>
                <Form {...submittalForm}>
                  <form onSubmit={submittalForm.handleSubmit((data) => createSubmittalMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={submittalForm.control}
                        name="number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Submittal Number</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-submittal-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={submittalForm.control}
                        name="specSection"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Spec Section</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ""} data-testid="input-submittal-spec-section" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={submittalForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-submittal-title" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={submittalForm.control}
                        name="requiredDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Required Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} data-testid="input-submittal-required-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={submittalForm.control}
                        name="submittedDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Submitted Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} data-testid="input-submittal-submitted-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={submittalForm.control}
                      name="reviewStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Review Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-submittal-review-status">
                                <SelectValue placeholder="Select review status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Pending">Pending</SelectItem>
                              <SelectItem value="Approved">Approved</SelectItem>
                              <SelectItem value="Rejected">Rejected</SelectItem>
                              <SelectItem value="Resubmit">Resubmit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={submittalForm.control}
                      name="resubmittalNeededBool"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-submittal-resubmittal-needed"
                            />
                          </FormControl>
                          <FormLabel>Resubmittal Needed</FormLabel>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={submittalForm.control}
                        name="owner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-submittal-owner" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={submittalForm.control}
                        name="ballInCourt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ball in Court</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-submittal-ball-in-court" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewSubmittal(false)}
                        data-testid="button-cancel-submittal"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createSubmittalMutation.isPending}
                        className="bg-brand-secondary text-white hover:bg-brand-primary"
                        data-testid="button-create-submittal"
                      >
                        {createSubmittalMutation.isPending ? "Creating..." : "Create Submittal"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spec Section</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Required Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submittals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No submittals found. Create your first submittal to get started.
                    </td>
                  </tr>
                ) : (
                  submittals.map((submittal) => (
                    <tr key={submittal.id} data-testid={`row-submittal-${submittal.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{submittal.number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{submittal.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{submittal.specSection || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submittal.requiredDate ? new Date(submittal.requiredDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(submittal.reviewStatus)}`}>
                          {submittal.reviewStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{submittal.owner}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-brand-secondary hover:text-brand-primary mr-3" data-testid={`button-edit-submittal-${submittal.id}`}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="text-red-600 hover:text-red-900" data-testid={`button-delete-submittal-${submittal.id}`}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="fabrication" className="p-6 mt-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-brand-secondary">Fabrication</h3>
            <Dialog open={showNewFabrication} onOpenChange={setShowNewFabrication}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-brand-secondary text-white hover:bg-brand-primary"
                  data-testid="button-new-fabrication"
                >
                  <i className="fas fa-plus mr-2"></i>
                  New Fabrication
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create New Fabrication Item</DialogTitle>
                </DialogHeader>
                <Form {...fabricationForm}>
                  <form onSubmit={fabricationForm.handleSubmit((data) => createFabricationMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={fabricationForm.control}
                        name="component"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Component</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-fabrication-component" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={fabricationForm.control}
                        name="vendor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Vendor</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-fabrication-vendor" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={fabricationForm.control}
                        name="fabStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fabrication Start</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} data-testid="input-fabrication-fab-start" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={fabricationForm.control}
                        name="fabFinish"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fabrication Finish</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} data-testid="input-fabrication-fab-finish" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={fabricationForm.control}
                        name="shipDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ship Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} data-testid="input-fabrication-ship-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={fabricationForm.control}
                        name="needBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Need By</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ""} data-testid="input-fabrication-need-by" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={fabricationForm.control}
                        name="owner"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-fabrication-owner" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={fabricationForm.control}
                        name="ballInCourt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ball in Court</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-fabrication-ball-in-court" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={fabricationForm.control}
                      name="risks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risks</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} data-testid="textarea-fabrication-risks" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewFabrication(false)}
                        data-testid="button-cancel-fabrication"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createFabricationMutation.isPending}
                        className="bg-brand-secondary text-white hover:bg-brand-primary"
                        data-testid="button-create-fabrication"
                      >
                        {createFabricationMutation.isPending ? "Creating..." : "Create Fabrication"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Component</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fab Start</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fab Finish</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ship Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fabrication.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No fabrication items found. Create your first fabrication item to get started.
                    </td>
                  </tr>
                ) : (
                  fabrication.map((fab) => (
                    <tr key={fab.id} data-testid={`row-fabrication-${fab.id}`}>
                      <td className="px-6 py-4 text-sm text-gray-900">{fab.component}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fab.vendor}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fab.fabStart ? new Date(fab.fabStart).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fab.fabFinish ? new Date(fab.fabFinish).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {fab.shipDate ? new Date(fab.shipDate).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{fab.owner}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-brand-secondary hover:text-brand-primary mr-3" data-testid={`button-edit-fabrication-${fab.id}`}>
                          <i className="fas fa-edit"></i>
                        </button>
                        <button className="text-red-600 hover:text-red-900" data-testid={`button-delete-fabrication-${fab.id}`}>
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
