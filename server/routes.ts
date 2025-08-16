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

  // Files with enhanced processing
  app.get("/api/meetings/:id/files", async (req, res) => {
    try {
      const files = await storage.getFilesByMeeting(req.params.id);
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch files" });
    }
  });
  
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
        model: "gemini-2.5-pro",
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

      if (format === 'minutes') {
        // Generate formatted meeting minutes
        const minutes = {
          header: {
            company: "Adams & Grand Demolition",
            title: `Weekly Progress Meeting #${meeting.seqNum}`,
            project: project?.name,
            date: meeting.date,
            time: meeting.time,
            location: meeting.location,
            preparedBy: meeting.preparedBy
          },
          attendees: attendance.filter(a => a.presentBool).map(a => `${a.name} - ${a.company}`),
          agenda: agenda.map(item => ({
            topic: item.title,
            discussion: item.discussion,
            decision: item.decision
          })),
          actionItems: actions.map(item => ({
            action: item.action,
            owner: item.owner,
            dueDate: item.dueDate,
            status: item.status,
            notes: item.notes
          })),
          nextMeeting: {
            expectedDate: "TBD",
            carryForwardItems: actions.filter(a => a.status !== "Closed").length
          }
        };
        res.json(minutes);
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
      
      const prompt = `Generate professional meeting minutes for Adams & Grand Demolition Meeting #${meeting.seqNum}.
Attendees: ${attendance.filter(a => a.presentBool).map(a => a.name).join(', ')}

Agenda Items:
${agenda.map(a => `${a.title}: ${a.discussion || 'No discussion recorded'}`).join('\n')}

Action Items:
${actions.map(a => `- ${a.action} (Owner: ${a.owner})`).join('\n')}

Provide a professional summary.`;
      
      const response = await poe.chat.completions.create({
        model: "gemini-2.5-pro",
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
