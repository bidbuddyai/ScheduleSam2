import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMeetingSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Project, Meeting } from "@shared/schema";
import type { z } from "zod";

type InsertMeetingForm = z.infer<typeof insertMeetingSchema>;

export default function ProjectDetail() {
  const { id } = useParams();
  const { toast } = useToast();
  const [showNewMeeting, setShowNewMeeting] = useState(false);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", id],
  });

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery<Meeting[]>({
    queryKey: ["/api/projects", id, "meetings"],
  });

  const form = useForm<InsertMeetingForm>({
    resolver: zodResolver(insertMeetingSchema.omit({ projectId: true })),
    defaultValues: {
      seqNum: meetings.length + 1,
      date: new Date().toISOString().split('T')[0],
      time: "9:00 AM - 10:30 AM",
      location: "Main Conference Room",
      preparedBy: ""
    }
  });

  const createMeetingMutation = useMutation({
    mutationFn: async (data: InsertMeetingForm) => {
      const response = await apiRequest("POST", `/api/projects/${id}/meetings?carryForward=true`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", id, "meetings"] });
      setShowNewMeeting(false);
      form.reset();
      toast({
        title: "Meeting created",
        description: "The new meeting has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMeetingForm) => {
    createMeetingMutation.mutate({
      ...data,
      seqNum: meetings.length + 1
    });
  };

  if (projectLoading || meetingsLoading) {
    return (
      <Layout>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </main>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Project not found</h3>
                <p className="text-gray-500 mb-4">The requested project could not be found.</p>
                <Link href="/projects">
                  <Button>Back to Projects</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </Layout>
    );
  }

  const sortedMeetings = meetings.sort((a, b) => b.seqNum - a.seqNum);

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/projects" className="text-gray-500 hover:text-gray-700">
              Projects
            </Link>
            <i className="fas fa-chevron-right text-gray-400 text-xs"></i>
            <span className="text-gray-900 font-medium">{project.name}</span>
          </nav>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Project Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-4">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: project.colorPrimary }}
                >
                  <i className="fas fa-building text-white text-2xl"></i>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-brand-primary">{project.name}</h2>
                  <p className="text-gray-600">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Dialog open={showNewMeeting} onOpenChange={setShowNewMeeting}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-brand-secondary text-white hover:bg-brand-primary"
                    data-testid="button-new-meeting"
                  >
                    <i className="fas fa-plus mr-2"></i>
                    New Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Create New Meeting</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-meeting-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-meeting-time" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-meeting-location" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="preparedBy"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prepared By</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-meeting-prepared-by" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowNewMeeting(false)}
                          data-testid="button-cancel-meeting"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createMeetingMutation.isPending}
                          className="bg-brand-secondary text-white hover:bg-brand-primary"
                          data-testid="button-create-meeting"
                        >
                          {createMeetingMutation.isPending ? "Creating..." : "Create Meeting"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Meetings List */}
        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
              <i className="fas fa-calendar-alt"></i>
              <span>Meetings ({meetings.length})</span>
            </h3>
          </div>
          <CardContent className="p-6">
            {meetings.length === 0 ? (
              <div className="text-center py-12">
                <i className="fas fa-calendar-plus text-4xl text-gray-400 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No meetings yet</h3>
                <p className="text-gray-500 mb-4">Create your first meeting to get started.</p>
                <Button 
                  onClick={() => setShowNewMeeting(true)}
                  className="bg-brand-secondary text-white hover:bg-brand-primary"
                  data-testid="button-create-first-meeting"
                >
                  Create Meeting
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedMeetings.map((meeting) => (
                  <div
                    key={meeting.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-brand-accent bg-opacity-20 rounded-lg flex items-center justify-center">
                          <span className="text-brand-primary font-bold">#{meeting.seqNum}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Weekly Progress Meeting #{meeting.seqNum}
                          </h4>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <i className="fas fa-calendar text-brand-secondary"></i>
                              <span>{new Date(meeting.date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <i className="fas fa-clock text-brand-secondary"></i>
                              <span>{meeting.time}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <i className="fas fa-map-marker-alt text-brand-secondary"></i>
                              <span>{meeting.location}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Link 
                        href={`/project/${project.id}/meeting/${meeting.seqNum}`}
                        data-testid={`link-meeting-${meeting.seqNum}`}
                      >
                        <Button 
                          variant="outline"
                          className="text-brand-secondary border-brand-secondary hover:bg-brand-secondary hover:text-white"
                        >
                          Open Meeting
                          <i className="fas fa-arrow-right ml-2"></i>
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </Layout>
  );
}
