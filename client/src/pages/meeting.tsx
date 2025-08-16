import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import Layout from "@/components/Layout";
import MeetingHeader from "@/components/MeetingHeader";
import AttendanceSection from "@/components/AttendanceSection";
import AgendaSection from "@/components/AgendaSection";
import TabbedSection from "@/components/TabbedSection";
import ActionItemsSection from "@/components/ActionItemsSection";
import OpenItemsSection from "@/components/OpenItemsSection";
import DistributionSection from "@/components/DistributionSection";
import AssistantPanel from "@/components/AssistantPanel";
import ScheduleUpdateSection from "@/components/ScheduleUpdateSection";
import MeetingFileUpload from "@/components/MeetingFileUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import type { Project, Meeting as MeetingType } from "@shared/schema";

export default function Meeting() {
  const { projectId, seq } = useParams();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ["/api/projects", projectId],
  });

  const { data: meeting, isLoading: meetingLoading } = useQuery<MeetingType>({
    queryKey: ["/api/projects", projectId, "meetings", seq],
    enabled: !!projectId && !!seq,
  });

  if (projectLoading || meetingLoading) {
    return (
      <Layout>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <Skeleton className="h-96 w-full rounded-lg" />
              </div>
              <div>
                <Skeleton className="h-64 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </main>
      </Layout>
    );
  }

  if (!project || !meeting) {
    return (
      <Layout>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Meeting not found</h3>
                <p className="text-gray-500 mb-4">The requested meeting could not be found.</p>
                <Link href="/projects">
                  <button className="bg-brand-secondary text-white px-4 py-2 rounded-lg hover:bg-brand-primary">
                    Back to Projects
                  </button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </main>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Breadcrumb */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center space-x-2 text-sm flex-wrap">
            <Link href="/projects" className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              Projects
            </Link>
            <i className="fas fa-chevron-right text-gray-400 dark:text-gray-500 text-xs"></i>
            <Link href={`/project/${project.id}`} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              {project.name}
            </Link>
            <i className="fas fa-chevron-right text-gray-400 dark:text-gray-500 text-xs"></i>
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              Meeting #{meeting.seqNum} - {new Date(meeting.date).toLocaleDateString()}
            </span>
          </nav>
        </div>
      </motion.div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Meeting Document Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 transition-colors"
        >
          <div className="px-4 sm:px-8 py-4 sm:py-6">
            <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4 sm:pb-6 mb-4 sm:mb-6">
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-xl sm:text-2xl font-bold text-brand-secondary mb-2"
              >
                Adams & Grand Demolition
              </motion.h1>
              <motion.h2 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200 mb-1"
              >
                Weekly Progress Meeting #{meeting.seqNum}
              </motion.h2>
              <motion.h3 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-base sm:text-lg text-gray-600 dark:text-gray-400"
              >
                {project.name}
              </motion.h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Meeting Details</h4>
                <p className="text-sm text-gray-600">Date: {new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <p className="text-sm text-gray-600">Time: {meeting.time}</p>
                <p className="text-sm text-gray-600">Location: {meeting.location}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Meeting Chair</h4>
                <p className="text-sm text-gray-600">Prepared by: {meeting.preparedBy}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-700 mb-2">Attendees</h4>
                <AttendanceSection meetingId={meeting.id} isCompact={true} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Agenda & Discussion */}
        <AgendaSection meetingId={meeting.id} />

        <Separator className="my-8" />

        {/* Meeting Minutes - Action Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
              <i className="fas fa-tasks"></i>
              <span>Action Items & Decisions</span>
            </h3>
          </div>
          <ActionItemsSection meetingId={meeting.id} isEmbedded={true} />
        </div>

        <Separator className="my-8" />

        {/* Additional Business */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
              <i className="fas fa-clipboard-check"></i>
              <span>Additional Business</span>
            </h3>
            <p className="text-sm text-gray-600 mt-1">RFIs, Submittals, and Fabrication Items</p>
          </div>
          <TabbedSection meetingId={meeting.id} />
        </div>

        <Separator className="my-8" />

        {/* Open Items & Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
                <i className="fas fa-exclamation-circle"></i>
                <span>Open Items</span>
              </h3>
            </div>
            <OpenItemsSection projectId={project.id} isEmbedded={true} />
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-brand-secondary flex items-center space-x-2">
                <i className="fas fa-share-alt"></i>
                <span>Distribution List</span>
              </h3>
            </div>
            <DistributionSection meetingId={meeting.id} isEmbedded={true} />
          </div>
        </div>

        {/* File Upload & Schedule Integration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <MeetingFileUpload meetingId={meeting.id} />
          <ScheduleUpdateSection meetingId={meeting.id} projectId={project.id} />
        </div>
        
        {/* AI Assistant */}
        <AssistantPanel meetingId={meeting.id} />
      </main>
    </Layout>
  );
}
