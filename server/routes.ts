import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { poe } from "./poeClient";
import { SYSTEM_ASSISTANT, ToolSchema } from "./assistantTools";
import { 
  insertProjectSchema, insertMeetingSchema, insertAttendanceSchema,
  insertAgendaItemSchema, insertActionItemSchema, insertOpenItemSchema,
  insertRfiSchema, insertSubmittalSchema, insertFabricationSchema,
  insertDistributionSchema, insertFileSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const data = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(data);
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
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
      res.status(500).json({ error: "Failed to fetch project" });
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

      // Create 9 standard agenda topics
      const agendaTopics = [
        "Safety Review & Incidents",
        "Schedule Review", 
        "Quality Control",
        "Subcontractor Coordination",
        "Material & Equipment Status",
        "Change Orders & Variations",
        "Environmental & Compliance",
        "Budget & Cost Review",
        "Next Week Planning"
      ];

      for (let i = 0; i < agendaTopics.length; i++) {
        await storage.createAgendaItem({
          meetingId: meeting.id,
          topicOrder: i + 1,
          title: agendaTopics[i],
          discussion: "",
          decision: ""
        });
      }

      // Carry forward action items if requested
      if (carryForward === 'true') {
        const previousMeetings = await storage.getMeetingsByProject(req.params.id);
        const sortedMeetings = previousMeetings
          .filter(m => m.id !== meeting.id)
          .sort((a, b) => b.seqNum - a.seqNum);
        
        if (sortedMeetings.length > 0) {
          const lastMeeting = sortedMeetings[0];
          const actionItems = await storage.getActionItemsByMeeting(lastMeeting.id);
          const openItems = actionItems.filter(item => item.status !== "Closed");
          
          for (const item of openItems) {
            await storage.createActionItem({
              meetingId: meeting.id,
              agendaItemId: item.agendaItemId,
              action: item.action,
              owner: item.owner,
              ballInCourt: item.ballInCourt,
              dueDate: item.dueDate,
              status: item.status,
              notes: item.notes,
              sourceMeetingId: lastMeeting.id
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

  // Files
  app.post("/api/meetings/:id/files", async (req, res) => {
    try {
      const data = insertFileSchema.parse({
        ...req.body,
        meetingId: req.params.id
      });
      const file = await storage.createFile(data);
      res.json(file);
    } catch (error) {
      res.status(400).json({ error: "Invalid file data" });
    }
  });

  // Export
  app.get("/api/meetings/:id/export", async (req, res) => {
    try {
      const { format } = req.query;
      const meeting = await storage.getMeeting(req.params.id);
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Get all meeting data
      const [agenda, actions, rfis, submittals, fabrication, attendance, distribution] = await Promise.all([
        storage.getAgendaItemsByMeeting(meeting.id),
        storage.getActionItemsByMeeting(meeting.id),
        storage.getRfisByMeeting(meeting.id),
        storage.getSubmittalsByMeeting(meeting.id),
        storage.getFabricationByMeeting(meeting.id),
        storage.getAttendanceByMeeting(meeting.id),
        storage.getDistributionByMeeting(meeting.id)
      ]);

      const exportData = {
        meeting,
        agenda,
        actions,
        rfis,
        submittals,
        fabrication,
        attendance,
        distribution
      };

      if (format === 'json') {
        res.json(exportData);
      } else {
        // For now, return JSON for all formats
        // In production, implement proper DOCX/PDF/CSV export
        res.json(exportData);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to export meeting" });
    }
  });

  // AI Assistant
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, model = "gemini-2.5-pro" } = req.body;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
