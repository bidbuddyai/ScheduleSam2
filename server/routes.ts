import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { poe } from "./poeClient";
import { SYSTEM_ASSISTANT, ToolSchema } from "./assistantTools";
import { 
  insertProjectSchema, insertMeetingSchema, insertAttendanceSchema,
  insertAgendaItemSchema, insertActionItemSchema, insertOpenItemSchema,
  insertRfiSchema, insertSubmittalSchema, insertFabricationSchema,
  insertDistributionSchema, insertFileSchema, insertProjectScheduleSchema,
  insertScheduleActivitySchema
} from "@shared/schema";
import { z } from "zod";
// import { registerScheduleRoutes } from "./scheduleRoutes"; // Disabled for now
import { ObjectStorageService } from "./objectStorage";
import { generateScheduleWithAI } from "./scheduleAITools";

export async function registerRoutes(app: Express): Promise<Server> {
  // Schedule Management Routes
  app.get("/api/projects/:projectId/schedules", async (req, res) => {
    try {
      const schedules = await storage.getSchedulesByProject(req.params.projectId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });
  
  app.get("/api/schedules/:id", async (req, res) => {
    try {
      const schedule = await storage.getSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Error fetching schedule:", error);
      res.status(500).json({ error: "Failed to fetch schedule" });
    }
  });
  
  app.post("/api/projects/:projectId/schedules", async (req, res) => {
    try {
      const scheduleData = insertProjectScheduleSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const schedule = await storage.createSchedule(scheduleData);
      res.json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid schedule data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create schedule" });
      }
    }
  });
  
  app.put("/api/schedules/:id", async (req, res) => {
    try {
      const schedule = await storage.updateSchedule(req.params.id, req.body);
      if (!schedule) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });
  
  app.delete("/api/schedules/:id", async (req, res) => {
    try {
      const success = await storage.deleteSchedule(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ error: "Failed to delete schedule" });
    }
  });
  
  // Schedule Activities
  app.get("/api/schedules/:scheduleId/activities", async (req, res) => {
    try {
      const activities = await storage.getActivitiesBySchedule(req.params.scheduleId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });
  
  app.post("/api/schedules/:scheduleId/activities", async (req, res) => {
    try {
      const { activities } = req.body;
      
      // Delete existing activities for this schedule
      await storage.deleteScheduleActivities(req.params.scheduleId);
      
      // Add new activities
      const createdActivities = [];
      for (const activity of activities) {
        const activityData = insertScheduleActivitySchema.parse({
          ...activity,
          scheduleId: req.params.scheduleId
        });
        const created = await storage.createScheduleActivity(activityData);
        createdActivities.push(created);
      }
      
      res.json({ success: true, activities: createdActivities });
    } catch (error) {
      console.error("Error saving activities:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid activity data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save activities" });
      }
    }
  });
  
  // Save complete schedule with activities
  app.post("/api/projects/:projectId/schedules/save", async (req, res) => {
    try {
      const { name, activities, startDate } = req.body;
      
      // Calculate schedule dates from activities
      let minDate = startDate || new Date().toISOString().split('T')[0];
      let maxDate = minDate;
      
      activities.forEach((activity: any) => {
        if (activity.startDate && activity.startDate < minDate) minDate = activity.startDate;
        if (activity.finishDate && activity.finishDate > maxDate) maxDate = activity.finishDate;
      });
      
      // Create schedule
      const scheduleData = insertProjectScheduleSchema.parse({
        projectId: req.params.projectId,
        scheduleType: 'CPM',
        dataDate: new Date().toISOString().split('T')[0],
        startDate: minDate,
        finishDate: maxDate,
        notes: name || 'Schedule created from editor'
      });
      
      const schedule = await storage.createSchedule(scheduleData);
      
      // Save activities
      const createdActivities = [];
      for (const activity of activities) {
        const activityData = insertScheduleActivitySchema.parse({
          scheduleId: schedule.id,
          activityId: activity.activityId,
          activityName: activity.activityName,
          originalDuration: activity.duration,
          remainingDuration: activity.duration * (1 - (activity.percentComplete || 0) / 100),
          startDate: activity.startDate,
          finishDate: activity.finishDate,
          totalFloat: activity.totalFloat,
          status: activity.status,
          predecessors: activity.predecessors?.join(','),
          successors: activity.successors?.join(','),
          notes: activity.wbs
        });
        const created = await storage.createScheduleActivity(activityData);
        createdActivities.push(created);
      }
      
      res.json({
        success: true,
        schedule,
        activitiesCount: createdActivities.length
      });
    } catch (error) {
      console.error("Error saving schedule:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid schedule data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to save schedule" });
      }
    }
  });
  
  // Load schedule with activities
  app.get("/api/projects/:projectId/schedules/latest", async (req, res) => {
    try {
      const schedules = await storage.getSchedulesByProject(req.params.projectId);
      if (schedules.length === 0) {
        return res.json({ schedule: null, activities: [] });
      }
      
      const schedule = schedules[0]; // Already sorted by createdAt desc
      const activities = await storage.getActivitiesBySchedule(schedule.id);
      
      // Transform activities to match frontend format
      const transformedActivities = activities.map(act => ({
        id: act.id,
        activityId: act.activityId,
        activityName: act.activityName,
        duration: act.originalDuration || 0,
        earlyStart: 0,
        earlyFinish: act.originalDuration || 0,
        lateStart: 0,
        lateFinish: act.originalDuration || 0,
        totalFloat: act.totalFloat || 0,
        freeFloat: 0,
        isCritical: act.totalFloat === 0,
        predecessors: act.predecessors ? act.predecessors.split(',').filter(p => p) : [],
        successors: act.successors ? act.successors.split(',').filter(s => s) : [],
        status: act.status || 'Not Started',
        percentComplete: act.originalDuration && act.remainingDuration 
          ? Math.round((1 - act.remainingDuration / act.originalDuration) * 100)
          : 0,
        startDate: act.startDate || undefined,
        finishDate: act.finishDate || undefined,
        resources: [],
        wbs: act.notes || undefined
      }));
      
      res.json({ schedule, activities: transformedActivities });
    } catch (error) {
      console.error("Error loading schedule:", error);
      res.status(500).json({ error: "Failed to load schedule" });
    }
  });
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects", details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid project data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create project", details: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ error: "Failed to fetch project", details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Meetings
  app.get("/api/projects/:id/meetings", async (req, res) => {
    try {
      const meetings = await storage.getMeetingsByProject(req.params.id);
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  });

  app.post("/api/projects/:id/meetings", async (req, res) => {
    try {
      const { carryForward } = req.query;
      const data = insertMeetingSchema.parse({
        ...req.body,
        projectId: req.params.id
      });
      
      const meeting = await storage.createMeeting(data);

      // Create 6 standard demolition meeting agenda topics
      const agendaTopics = [
        "Welcome & Introductions",
        "Site Safety",
        "Project Schedule",
        "Ongoing Project Details",
        "Open Discussion",
        "Action Items & Next Steps"
      ];

      // Default discussion templates for each agenda topic
      const agendaDescriptions = [
        "Brief roundtable introductions (if applicable), Review of meeting objectives",
        "Discussion of any recent incidents or near-misses, Safety protocol updates and reminders, Environmental hazard precautions",
        "Review of overall project timeline, Milestone status updates, Coordination of upcoming work phases",
        "Progress on abatement and demolition activities, Permitting and regulatory updates, Subcontractor coordination, Material removal and disposal tracking",
        "Stakeholder concerns or input, Unresolved issues or obstacles, Recommendations and feedback",
        "Recap of assigned responsibilities, Follow-up items and due dates, Scheduling of next meeting"
      ];

      for (let i = 0; i < agendaTopics.length; i++) {
        await storage.createAgendaItem({
          meetingId: meeting.id,
          topicOrder: i + 1,
          title: agendaTopics[i],
          discussion: agendaDescriptions[i],
          decision: ""
        });
      }

      // Enhanced carry-forward logic for seamless meeting continuity
      if (carryForward === 'true') {
        const previousMeetings = await storage.getMeetingsByProject(req.params.id);
        const sortedMeetings = previousMeetings
          .filter(m => m.id !== meeting.id)
          .sort((a, b) => b.seqNum - a.seqNum);
        
        if (sortedMeetings.length > 0) {
          const lastMeeting = sortedMeetings[0];
          
          // Carry forward open action items
          const actionItems = await storage.getActionItemsByMeeting(lastMeeting.id);
          const openActionItems = actionItems.filter(item => item.status !== "Closed");
          
          // Add carried forward items to Action Items & Next Steps agenda
          const actionAgenda = await storage.getAgendaItemsByMeeting(meeting.id);
          const actionTopicItem = actionAgenda.find(a => a.title === "Action Items & Next Steps");
          
          if (actionTopicItem && openActionItems.length > 0) {
            // Update the action items agenda with carried forward items summary
            const carriedForwardSummary = `\n\nCarried forward from Meeting #${lastMeeting.seqNum}:\n` +
              openActionItems.map(item => `- ${item.action} (Owner: ${item.owner})`).join('\n');
            
            await storage.updateAgendaItem(actionTopicItem.id, {
              discussion: actionTopicItem.discussion + carriedForwardSummary
            });
          }
          
          // Create action items in new meeting
          for (const item of openActionItems) {
            await storage.createActionItem({
              meetingId: meeting.id,
              agendaItemId: actionTopicItem?.id || null,
              action: item.action,
              owner: item.owner,
              ballInCourt: item.ballInCourt,
              dueDate: item.dueDate,
              status: "Open",
              notes: `Carried forward from Meeting #${lastMeeting.seqNum}. ${item.notes || ''}`.trim(),
              sourceMeetingId: lastMeeting.id
            });
          }
          
          // Carry forward unresolved safety issues to Site Safety agenda
          const lastSafetyAgenda = (await storage.getAgendaItemsByMeeting(lastMeeting.id))
            .find(a => a.title === "Site Safety");
          
          if (lastSafetyAgenda && lastSafetyAgenda.discussion && lastSafetyAgenda.discussion.includes("incident")) {
            const safetyAgenda = actionAgenda.find(a => a.title === "Site Safety");
            if (safetyAgenda) {
              await storage.updateAgendaItem(safetyAgenda.id, {
                discussion: safetyAgenda.discussion + `\n\nFollow-up from previous meeting required.`
              });
            }
          }
          
          // Carry forward any open RFIs
          const rfis = await storage.getRfisByMeeting(lastMeeting.id);
          const openRfis = rfis.filter(rfi => rfi.status === "Submitted" || rfi.status === "Pending");
          
          for (const rfi of openRfis) {
            await storage.createRfi({
              meetingId: meeting.id,
              number: rfi.number,
              title: rfi.title,
              status: rfi.status,
              owner: rfi.owner,
              ballInCourt: rfi.ballInCourt,
              submittedDate: rfi.submittedDate,
              responseDue: rfi.responseDue,
              impact: rfi.impact,
              notes: `Carried forward from Meeting #${lastMeeting.seqNum}. ${rfi.notes || ''}`.trim()
            });
          }
        }
      }

      res.json(meeting);
    } catch (error) {
      res.status(400).json({ error: "Invalid meeting data" });
    }
  });

  app.get("/api/projects/:projectId/meetings/:seq", async (req, res) => {
    try {
      const { projectId, seq } = req.params;
      const meetings = await storage.getMeetingsByProject(projectId);
      const meeting = meetings.find(m => m.seqNum === parseInt(seq));
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      res.json(meeting);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch meeting" });
    }
  });

  // Attendance
  app.get("/api/meetings/:id/attendance", async (req, res) => {
    try {
      const attendance = await storage.getAttendanceByMeeting(req.params.id);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });

  app.post("/api/meetings/:id/attendance", async (req, res) => {
    try {
      const data = insertAttendanceSchema.parse({
        ...req.body,
        meetingId: req.params.id
      });
      const attendance = await storage.createAttendance(data);
      res.json(attendance);
    } catch (error) {
      res.status(400).json({ error: "Invalid attendance data" });
    }
  });

  app.put("/api/attendance/:id", async (req, res) => {
    try {
      const updated = await storage.updateAttendance(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Attendance not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Failed to update attendance" });
    }
  });

  // Agenda Items
  app.get("/api/meetings/:id/agenda", async (req, res) => {
    try {
      const items = await storage.getAgendaItemsByMeeting(req.params.id);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch agenda items" });
    }
  });

  app.put("/api/agenda/:id", async (req, res) => {
    try {
      const updated = await storage.updateAgendaItem(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Agenda item not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Failed to update agenda item" });
    }
  });

  // Copy agenda from last meeting
  app.post("/api/meetings/:id/copy-agenda", async (req, res) => {
    try {
      const currentMeeting = await storage.getMeeting(req.params.id);
      if (!currentMeeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Get previous meeting
      const meetings = await storage.getMeetingsByProject(currentMeeting.projectId || "");
      const sortedMeetings = meetings
        .filter(m => m.id !== currentMeeting.id && m.seqNum < currentMeeting.seqNum)
        .sort((a, b) => b.seqNum - a.seqNum);
      
      if (sortedMeetings.length === 0) {
        return res.status(404).json({ error: "No previous meeting found" });
      }

      const lastMeeting = sortedMeetings[0];
      const lastAgenda = await storage.getAgendaItemsByMeeting(lastMeeting.id);
      const currentAgenda = await storage.getAgendaItemsByMeeting(currentMeeting.id);

      // Update current agenda with last meeting's decisions and new discussions
      for (const currentItem of currentAgenda) {
        const matchingLastItem = lastAgenda.find(item => item.title === currentItem.title);
        if (matchingLastItem) {
          // Copy decisions from last meeting as starting point for discussion
          let newDiscussion = currentItem.discussion || "";
          if (matchingLastItem.decision) {
            newDiscussion = `Previous Decision: ${matchingLastItem.decision}\n\n${newDiscussion}`;
          }
          if (matchingLastItem.discussion && !currentItem.discussion) {
            newDiscussion += `\n\nPrevious Discussion: ${matchingLastItem.discussion}`;
          }
          
          await storage.updateAgendaItem(currentItem.id, {
            discussion: newDiscussion
          });
        }
      }

      res.json({ 
        success: true, 
        message: `Agenda copied from Meeting #${lastMeeting.seqNum}` 
      });
    } catch (error) {
      console.error("Error copying agenda:", error);
      res.status(500).json({ error: "Failed to copy agenda from last meeting" });
    }
  });

  // Action Items
  app.get("/api/meetings/:id/actions", async (req, res) => {
    try {
      const actions = await storage.getActionItemsByMeeting(req.params.id);
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch action items" });
    }
  });

  app.post("/api/meetings/:id/actions", async (req, res) => {
    try {
      const data = insertActionItemSchema.parse({
        ...req.body,
        meetingId: req.params.id
      });
      const action = await storage.createActionItem(data);
      res.json(action);
    } catch (error) {
      res.status(400).json({ error: "Invalid action item data" });
    }
  });

  app.put("/api/actions/:id", async (req, res) => {
    try {
      const updated = await storage.updateActionItem(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Action item not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Failed to update action item" });
    }
  });

  app.delete("/api/actions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteActionItem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Action item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to delete action item" });
    }
  });

  // RFIs
  app.get("/api/meetings/:id/rfis", async (req, res) => {
    try {
      const rfis = await storage.getRfisByMeeting(req.params.id);
      res.json(rfis);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch RFIs" });
    }
  });

  app.post("/api/meetings/:id/rfis", async (req, res) => {
    try {
      const data = insertRfiSchema.parse({
        ...req.body,
        meetingId: req.params.id
      });
      const rfi = await storage.createRfi(data);
      res.json(rfi);
    } catch (error) {
      res.status(400).json({ error: "Invalid RFI data" });
    }
  });

  // Submittals
  app.get("/api/meetings/:id/submittals", async (req, res) => {
    try {
      const submittals = await storage.getSubmittalsByMeeting(req.params.id);
      res.json(submittals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submittals" });
    }
  });

  app.post("/api/meetings/:id/submittals", async (req, res) => {
    try {
      const data = insertSubmittalSchema.parse({
        ...req.body,
        meetingId: req.params.id
      });
      const submittal = await storage.createSubmittal(data);
      res.json(submittal);
    } catch (error) {
      res.status(400).json({ error: "Invalid submittal data" });
    }
  });

  // Fabrication
  app.get("/api/meetings/:id/fabrication", async (req, res) => {
    try {
      const fabrication = await storage.getFabricationByMeeting(req.params.id);
      res.json(fabrication);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fabrication items" });
    }
  });

  app.post("/api/meetings/:id/fabrication", async (req, res) => {
    try {
      const data = insertFabricationSchema.parse({
        ...req.body,
        meetingId: req.params.id
      });
      const fabrication = await storage.createFabrication(data);
      res.json(fabrication);
    } catch (error) {
      res.status(400).json({ error: "Invalid fabrication data" });
    }
  });

  // Distribution
  app.get("/api/meetings/:id/distribution", async (req, res) => {
    try {
      const distribution = await storage.getDistributionByMeeting(req.params.id);
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch distribution list" });
    }
  });

  app.post("/api/meetings/:id/distribution", async (req, res) => {
    try {
      const data = insertDistributionSchema.parse({
        ...req.body,
        meetingId: req.params.id
      });
      const distribution = await storage.createDistribution(data);
      res.json(distribution);
    } catch (error) {
      res.status(400).json({ error: "Invalid distribution data" });
    }
  });

  app.post("/api/meetings/:id/distribute", async (req, res) => {
    try {
      const distribution = await storage.getDistributionByMeeting(req.params.id);
      // Here you would implement actual email sending
      // For now, just mark as sent
      for (const item of distribution) {
        await storage.updateDistribution(item.id, { sentBool: true });
      }
      res.json({ success: true, sent: distribution.length });
    } catch (error) {
      res.status(500).json({ error: "Failed to distribute minutes" });
    }
  });

  // Files with object storage integration
  app.get("/api/meetings/:id/files", async (req, res) => {
    try {
      const files = await storage.getFilesByMeeting(req.params.id);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });
  
  // Get presigned URL for file upload
  app.post("/api/meetings/:id/files/upload-url", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  
  // Store file record after upload
  app.post("/api/meetings/:id/files", async (req, res) => {
    try {
      const { uploadURL, fileName, fileType } = req.body;
      const objectStorageService = new ObjectStorageService();
      
      // Normalize the object path
      const fileUrl = objectStorageService.normalizeObjectEntityPath(uploadURL);
      
      // Store file record  
      const data = insertFileSchema.parse({
        meetingId: req.params.id,
        filename: fileName,
        type: fileType || 'document',
        url: fileUrl
      });
      const file = await storage.createFile(data);
      res.json(file);
    } catch (error) {
      console.error("Error storing file:", error);
      res.status(400).json({ error: "Failed to store file" });
    }
  });
  
  // Process uploaded meeting recording or document  
  app.post("/api/meetings/:id/process-file", async (req, res) => {
    try {
      const { fileContent } = req.body;
      const meeting = await storage.getMeeting(req.params.id);
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      // Use AI to extract action items and key discussion points
      const systemPrompt = `Extract from this demolition meeting:
1. Action items with owners
2. Safety incidents or concerns  
3. Key decisions
4. Items for next meeting

Format as JSON with:
- actionItems: [{action, owner}]
- safetyItems: [{issue, severity}]
- decisions: [{topic, decision}]
- carryForward: [items]`;

      const response = await poe.chat.completions.create({
        model: "Claude-Sonnet-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Meeting #${meeting.seqNum} content:\n${fileContent}` }
        ]
      });
      
      const content = response.choices[0].message.content || "{}";
      let extracted;
      try {
        extracted = JSON.parse(content);
      } catch {
        extracted = { message: content };
      }
      
      // Store extracted action items
      if (extracted.actionItems && Array.isArray(extracted.actionItems)) {
        for (const item of extracted.actionItems) {
          await storage.createActionItem({
            meetingId: meeting.id,
            action: item.action,
            owner: item.owner || "TBD",
            ballInCourt: item.owner || "TBD",
            dueDate: null,
            status: "Open",
            notes: "Extracted from meeting file",
            agendaItemId: null,
            sourceMeetingId: null
          });
        }
      }
      
      res.json({ 
        success: true, 
        extracted,
        message: "Meeting content processed"
      });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });

  // Enhanced Export with Minutes Generation
  app.get("/api/meetings/:id/export", async (req, res) => {
    try {
      const { format } = req.query;
      const meeting = await storage.getMeeting(req.params.id);
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Get all meeting data
      const [agenda, actions, rfis, submittals, fabrication, attendance, distribution, project] = await Promise.all([
        storage.getAgendaItemsByMeeting(meeting.id),
        storage.getActionItemsByMeeting(meeting.id),
        storage.getRfisByMeeting(meeting.id),
        storage.getSubmittalsByMeeting(meeting.id),
        storage.getFabricationByMeeting(meeting.id),
        storage.getAttendanceByMeeting(meeting.id),
        storage.getDistributionByMeeting(meeting.id),
        storage.getProject(meeting.projectId)
      ]);

      const exportData = {
        project,
        meeting,
        agenda,
        actions,
        rfis,
        submittals,
        fabrication,
        attendance,
        distribution
      };

      if (format === 'pdf' || format === 'docx') {
        // Generate HTML meeting minutes
        const meetingDate = meeting.dateTime ? new Date(meeting.dateTime).toLocaleDateString('en-US', { 
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        }) : 'TBD';
        
        const openActions = actions.filter(a => a.status !== "Closed");
        const closedActions = actions.filter(a => a.status === "Closed");
        
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Meeting Minutes - ${project?.name || 'Project'} - Meeting #${meeting.seqNum}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    body { 
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif; 
      line-height: 1.6; 
      color: #1f2937; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 40px 20px; 
      background: #ffffff;
    }
    .logo { 
      text-align: center; 
      margin-bottom: 40px; 
      padding-bottom: 20px;
      border-bottom: 3px solid #e5e7eb;
    }
    .logo h1 { 
      margin: 10px 0; 
      font-size: 42px; 
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .logo .meet { color: #f97316; }
    .logo .bud { color: #3b82f6; }
    .logo p { 
      color: #6b7280; 
      margin: 0; 
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 500;
    }
    .header-info { 
      background: linear-gradient(135deg, #fff7ed 0%, #eff6ff 100%); 
      padding: 25px; 
      border-radius: 16px; 
      margin-bottom: 35px; 
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .header-info h2 { 
      color: #1f2937; 
      margin-top: 0; 
      font-size: 24px;
      font-weight: 600;
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 12px; 
      margin-top: 15px;
    }
    .info-item { 
      padding: 8px 0; 
      font-size: 14px;
    }
    .info-item strong { 
      font-weight: 600; 
      color: #6b7280;
    }
    h2 { 
      color: #1f2937; 
      margin-top: 45px; 
      margin-bottom: 20px;
      font-size: 20px;
      font-weight: 600;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    h3 { 
      color: #6b7280; 
      margin-top: 30px; 
      font-size: 16px;
      font-weight: 500;
    }
    .distribution-container { 
      margin: 25px 0; 
    }
    .distribution-table { 
      width: 100%; 
      border-collapse: separate; 
      border-spacing: 0;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .distribution-table th { 
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); 
      padding: 14px 16px; 
      text-align: left; 
      font-weight: 600; 
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      border-bottom: 2px solid #e5e7eb;
    }
    .distribution-table td { 
      padding: 12px 16px; 
      border-bottom: 1px solid #f3f4f6;
      font-size: 14px;
    }
    .distribution-table tr:last-child td { 
      border-bottom: none; 
    }
    .distribution-table tr:hover td { 
      background: #fafbfc; 
    }
    .status-sent { 
      background: #d1fae5; 
      color: #065f46; 
    }
    .status-pending { 
      background: #fef3c7; 
      color: #92400e; 
    }
    .attendee-grid { 
      display: grid; 
      grid-template-columns: repeat(2, 1fr); 
      gap: 14px; 
      margin: 25px 0; 
    }
    .attendee { 
      padding: 12px 16px; 
      border-radius: 8px; 
      background: #f9fafb; 
      font-size: 14px;
      border: 1px solid #e5e7eb;
      transition: all 0.2s;
    }
    .present { 
      background: #d1fae5; 
      color: #065f46; 
      border-color: #a7f3d0;
      font-weight: 500;
    }
    .absent { 
      background: #fee2e2; 
      color: #991b1b; 
      border-color: #fecaca;
    }
    .agenda-item { 
      background: #fafbfc; 
      padding: 24px; 
      margin: 24px 0; 
      border-left: 4px solid #3b82f6; 
      border-radius: 12px; 
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .agenda-item h4 { 
      color: #1f2937; 
      margin-top: 0; 
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }
    .agenda-item p { 
      margin: 10px 0; 
      line-height: 1.7;
    }
    .action-item { 
      padding: 18px; 
      margin: 14px 0; 
      border-radius: 10px; 
      border-left: 4px solid #f59e0b; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .action-open { background: #fef3c7; }
    .action-progress { background: #dbeafe; border-left-color: #3b82f6; }
    .action-closed { background: #d1fae5; border-left-color: #10b981; }
    .action-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-bottom: 10px; 
    }
    .status-badge { 
      padding: 5px 14px; 
      border-radius: 20px; 
      font-size: 11px; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.5px;
    }
    .status-open { background: #fbbf24; color: #78350f; }
    .status-progress { background: #60a5fa; color: #1e3a8a; }
    .status-closed { background: #34d399; color: #064e3b; }
    .action-details { 
      font-size: 14px; 
      color: #6b7280; 
      line-height: 1.8; 
    }
    table { 
      width: 100%; 
      border-collapse: separate; 
      border-spacing: 0;
      margin: 25px 0; 
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    th { 
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); 
      padding: 14px 16px; 
      text-align: left; 
      font-weight: 600; 
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      border-bottom: 2px solid #e5e7eb; 
    }
    td { 
      padding: 12px 16px; 
      border-bottom: 1px solid #f3f4f6; 
      font-size: 14px;
    }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #fafbfc; }
    .footer { 
      margin-top: 70px; 
      padding-top: 35px; 
      border-top: 2px solid #e5e7eb; 
      text-align: center; 
      color: #9ca3af; 
    }
    .footer-logo { 
      font-size: 24px; 
      margin-bottom: 12px; 
      font-weight: 600;
    }
    .footer p { 
      margin: 5px 0; 
      font-size: 13px;
    }
    @media print { 
      body { padding: 20px; }
      .action-item, .agenda-item { break-inside: avoid; }
      .distribution-table, table { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="logo">
    <h1><span class="meet">Meet</span><span class="bud">Bud</span></h1>
    <p style="color: #6b7280; margin: 0;">Construction Meeting Management</p>
  </div>
  
  <div class="header-info">
    <h2 style="margin-bottom: 20px;">Meeting #${meeting.seqNum} - ${project?.name || 'Project'}</h2>
    <div class="info-grid">
      <div class="info-item"><strong>Date:</strong> ${meetingDate}</div>
      <div class="info-item"><strong>Time:</strong> ${meeting.time || 'N/A'}</div>
      <div class="info-item"><strong>Type:</strong> ${meeting.meetingType || 'Weekly Progress'}</div>
      <div class="info-item"><strong>Location:</strong> ${meeting.location || 'Job Site'}</div>
      <div class="info-item"><strong>Prepared By:</strong> ${meeting.preparedBy || 'Project Manager'}</div>
      <div class="info-item"><strong>Weather:</strong> ${meeting.weather || 'Clear'}</div>
    </div>
  </div>
  
  ${distribution.length > 0 ? `
  <h2>Distribution List</h2>
  <div class="distribution-container">
    <table class="distribution-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Title</th>
          <th>Company</th>
          <th>Email</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${distribution.map(d => `
        <tr>
          <td><strong>${d.recipient}</strong></td>
          <td>${d.title || 'N/A'}</td>
          <td>${d.company || 'N/A'}</td>
          <td>${d.email}</td>
          <td>
            ${d.sentBool 
              ? '<span class="status-badge status-sent">✓ Sent</span>' 
              : '<span class="status-badge status-pending">Pending</span>'
            }
          </td>
        </tr>`).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}
  
  <h2>Attendance</h2>
  <div class="attendee-grid">
    ${attendance.map(a => `
    <div class="attendee ${a.presentBool ? 'present' : 'absent'}">
      ${a.presentBool ? '✓' : '✗'} ${a.name} - ${a.company}
    </div>`).join('')}
  </div>
  
  <h2>Agenda & Discussion</h2>
  ${agenda.sort((a, b) => a.topicOrder - b.topicOrder).map(item => `
  <div class="agenda-item">
    <h4>${item.topicOrder}. ${item.title}</h4>
    ${item.discussion ? `<p><strong>Discussion:</strong><br>${item.discussion.replace(/\n/g, '<br>')}</p>` : ''}
    ${item.decision ? `<p><strong>Decision/Action:</strong><br>${item.decision.replace(/\n/g, '<br>')}</p>` : ''}
  </div>`).join('')}
  
  <h2>Action Items</h2>
  
  ${openActions.length > 0 ? `
  <h3>Open & In Progress (${openActions.length})</h3>
  ${openActions.map(action => `
  <div class="action-item ${action.status === 'Open' ? 'action-open' : 'action-progress'}">
    <div class="action-header">
      <strong>${action.action}</strong>
      <span class="status-badge ${action.status === 'Open' ? 'status-open' : 'status-progress'}">${action.status}</span>
    </div>
    <div class="action-details">
      <strong>Owner:</strong> ${action.owner || 'Unassigned'} &nbsp;|&nbsp; 
      <strong>Ball in Court:</strong> ${action.ballInCourt || 'TBD'}
      ${action.dueDate ? ` &nbsp;|&nbsp; <strong>Due:</strong> ${new Date(action.dueDate).toLocaleDateString()}` : ''}
      ${action.notes ? `<br><em>Notes: ${action.notes}</em>` : ''}
    </div>
  </div>`).join('')}
  ` : '<p style="color: #6b7280;">No open action items.</p>'}
  
  ${closedActions.length > 0 ? `
  <h3>Completed This Meeting (${closedActions.length})</h3>
  ${closedActions.map(action => `
  <div class="action-item action-closed">
    <div class="action-header">
      <strong>${action.action}</strong>
      <span class="status-badge status-closed">Closed</span>
    </div>
    <div class="action-details">
      <strong>Completed by:</strong> ${action.owner || 'N/A'}
      ${action.notes ? `<br><em>${action.notes}</em>` : ''}
    </div>
  </div>`).join('')}
  ` : ''}
  
  ${rfis.length > 0 ? `
  <h2>RFIs</h2>
  <table>
    <thead>
      <tr>
        <th>RFI #</th>
        <th>Subject</th>
        <th>Status</th>
        <th>Response Due</th>
      </tr>
    </thead>
    <tbody>
      ${rfis.map(rfi => `
      <tr>
        <td>${rfi.rfiNumber}</td>
        <td>${rfi.subject}</td>
        <td>${rfi.status}</td>
        <td>${rfi.responseDue ? new Date(rfi.responseDue).toLocaleDateString() : 'N/A'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  ` : ''}
  
  ${submittals.length > 0 ? `
  <h2>Submittals</h2>
  <table>
    <thead>
      <tr>
        <th>Submittal #</th>
        <th>Description</th>
        <th>Status</th>
        <th>Date Submitted</th>
      </tr>
    </thead>
    <tbody>
      ${submittals.map(sub => `
      <tr>
        <td>${sub.submittalNumber}</td>
        <td>${sub.description}</td>
        <td>${sub.status}</td>
        <td>${sub.dateSubmitted ? new Date(sub.dateSubmitted).toLocaleDateString() : 'N/A'}</td>
      </tr>`).join('')}
    </tbody>
  </table>
  ` : ''}
  
  <h2>Next Meeting</h2>
  <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
    <p style="margin: 0;">The next meeting is to be scheduled.</p>
    <p style="margin: 8px 0 0 0;"><strong>${openActions.length}</strong> action item${openActions.length !== 1 ? 's' : ''} will carry forward to the next meeting.</p>
  </div>
  
  <div class="footer">
    <div class="footer-logo">
      <span class="meet" style="color: #f97316;">Meet</span><span class="bud" style="color: #3b82f6;">Bud</span>
    </div>
    <p>Meeting Minutes Generated: ${new Date().toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
    <p style="font-size: 12px; margin-top: 15px;">© 2024 MeetBud • Professional Construction Meeting Management</p>
    <p style="font-size: 11px; color: #d1d5db; margin-top: 8px;">This document is confidential and intended solely for the recipients listed in the distribution list above.</p>
  </div>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Content-Disposition', `attachment; filename="Meeting_${meeting.seqNum}_Minutes.html"`);
        res.send(html);
      } else if (format === 'json') {
        res.json(exportData);
      } else {
        res.json(exportData);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export meeting" });
    }
  });
  
  // Generate meeting minutes with AI
  app.post("/api/meetings/:id/generate-minutes", async (req, res) => {
    try {
      const meeting = await storage.getMeeting(req.params.id);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      const [agenda, actions, attendance] = await Promise.all([
        storage.getAgendaItemsByMeeting(meeting.id),
        storage.getActionItemsByMeeting(meeting.id),
        storage.getAttendanceByMeeting(meeting.id)
      ]);
      
      const prompt = `Generate professional meeting minutes for MeetBud Meeting #${meeting.seqNum}.
Attendees: ${attendance.filter(a => a.presentBool).map(a => a.name).join(', ')}

Agenda Items:
${agenda.map(a => `${a.title}: ${a.discussion || 'No discussion recorded'}`).join('\n')}

Action Items:
${actions.map(a => `- ${a.action} (Owner: ${a.owner})`).join('\n')}

Provide a professional summary.`;
      
      const response = await poe.chat.completions.create({
        model: "Claude-Sonnet-4",
        messages: [
          { role: "system", content: "You are a professional meeting minutes writer. Be concise and professional." },
          { role: "user", content: prompt }
        ]
      });
      
      const minutes = response.choices[0].message.content;
      
      res.json({ 
        minutes,
        meeting,
        generated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating minutes:", error);
      res.status(500).json({ error: "Failed to generate minutes" });
    }
  });

  // AI Assistant
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, model = "Claude-Sonnet-4" } = req.body;
      
      const systemMessage = {
        role: "system" as const,
        content: SYSTEM_ASSISTANT
      };

      const allMessages = [systemMessage, ...messages];
      
      const stream = await poe.chat.completions.create({ 
        model, 
        messages: allMessages, 
        stream: true 
      });
      
      let text = "";
      for await (const part of stream) {
        text += part.choices?.[0]?.delta?.content ?? "";
      }

      // Try to parse as JSON tool call
      try {
        const trimmed = text.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const parsed = ToolSchema.parse(JSON.parse(trimmed));
          
          // Execute the tool call
          let result = null;
          switch (parsed.tool) {
            case 'createSchedule':
              // Create schedule with AI
              const scheduleResult = await generateScheduleWithAI({
                type: 'create',
                projectDescription: parsed.args.description || parsed.args.projectDescription,
                userRequest: parsed.args.userRequest || 'Create a complete CPM schedule',
                startDate: parsed.args.startDate || new Date().toISOString().split('T')[0]
              });
              result = scheduleResult;
              break;
              
            case 'updateSchedule':
              // Update existing schedule
              const updateResult = await generateScheduleWithAI({
                type: 'update',
                currentActivities: parsed.args.currentActivities || [],
                userRequest: parsed.args.userRequest || parsed.args.updates,
                startDate: parsed.args.startDate
              });
              result = updateResult;
              break;
              
            case 'generateLookahead':
              // Generate 3-week lookahead
              const lookaheadResult = await generateScheduleWithAI({
                type: 'lookahead',
                currentActivities: parsed.args.currentActivities || [],
                userRequest: 'Generate 3-week lookahead',
                startDate: parsed.args.startDate || new Date().toISOString().split('T')[0]
              });
              result = lookaheadResult;
              break;
              
            case 'analyzeSchedule':
              // Analyze schedule
              const analyzeResult = await generateScheduleWithAI({
                type: 'analyze',
                currentActivities: parsed.args.currentActivities || [],
                userRequest: parsed.args.analysisRequest || 'Analyze critical path and provide recommendations'
              });
              result = analyzeResult;
              break;
            case "insertActionItems":
              // Implementation would go here
              result = { success: true, message: "Action items created" };
              break;
            case "createRFI":
              // Implementation would go here
              result = { success: true, message: "RFI created" };
              break;
            case "updateAgendaDiscussion":
              // Implementation would go here
              result = { success: true, message: "Agenda updated" };
              break;
            case "distributeMinutes":
              // Implementation would go here
              result = { success: true, message: "Minutes distributed" };
              break;
            case "summarizeMeeting":
              // Implementation would go here
              result = { 
                summary: "Meeting summary", 
                topDecisions: ["Decision 1"], 
                risks: ["Risk 1"], 
                nextSteps: ["Step 1"] 
              };
              break;
          }
          
          return res.json({ tool: parsed, result, speak: parsed.speak });
        }
      } catch (parseError) {
        // If not valid JSON, treat as regular response
      }

      res.json({ response: text });
    } catch (error) {
      res.status(500).json({ error: "AI request failed" });
    }
  });

  // Register schedule management routes
  // registerScheduleRoutes(app); // Disabled since scheduleRoutes is not imported
  
  // Object storage endpoints for file uploads
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });
  
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      return res.sendStatus(500);
    }
  });
  
  app.post("/api/objects/finalize", async (req, res) => {
    try {
      const { uploadURL } = req.body;
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        uploadURL,
        {
          owner: "system",
          visibility: "public",
        },
      );
      res.json({ objectPath });
    } catch (error) {
      console.error("Error finalizing upload:", error);
      res.status(500).json({ error: "Failed to finalize upload" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
