import type { Express } from "express";
import { poe } from "./poeClient";
import { storage } from "./storage";
import { DbStorage } from "./dbStorage";
import { 
  insertProjectScheduleSchema, 
  insertScheduleActivitySchema, 
  insertScheduleUpdateSchema,
  projectSchedules,
  scheduleActivities,
  scheduleUpdates
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { generateScheduleWithAI, identifyScheduleImpacts } from "./scheduleAITools";
import { parseScheduleFile } from "./scheduleParser";
import { exportSchedule } from "./scheduleExporter";
import type { Activity } from "../client/src/components/ScheduleEditor";

export function registerScheduleRoutes(app: Express) {
  // Check if we have database storage
  const hasDbStorage = storage instanceof DbStorage;
  const dbStorage = hasDbStorage ? (storage as unknown as DbStorage) : null;

  // Get project schedules
  app.get("/api/projects/:projectId/schedules", async (req, res) => {
    if (!hasDbStorage) {
      return res.json([]); // Return empty array for in-memory storage
    }
    try {
      const schedules = await dbStorage!.db
        .select()
        .from(projectSchedules)
        .where(eq(projectSchedules.projectId, req.params.projectId))
        .orderBy(desc(projectSchedules.createdAt));
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  // Import schedule from XER, MPP, PDF, or XML
  app.post("/api/projects/:projectId/schedules/import", async (req, res) => {
    if (!hasDbStorage) {
      return res.status(501).json({ error: "Schedule import requires database storage" });
    }
    try {
      const { fileContent, filename } = req.body;
      
      // Parse the schedule file
      const parsedData = await parseScheduleFile(fileContent, filename);
      
      if (parsedData.activities.length === 0) {
        return res.status(400).json({ error: "No activities found in the file" });
      }
      
      // Create schedule record
      const schedule = await dbStorage!.db.insert(projectSchedules).values({
        projectId: req.params.projectId,
        scheduleType: "CPM",
        dataDate: parsedData.projectInfo.dataDate || new Date().toISOString().split('T')[0],
        startDate: parsedData.projectInfo.startDate || parsedData.activities[0]?.startDate || "",
        finishDate: parsedData.projectInfo.finishDate || parsedData.activities[parsedData.activities.length - 1]?.finishDate || "",
        fileUrl: filename,
        version: 1,
        notes: parsedData.summary
      }).returning();
      
      // Store activities
      const activityRecords = parsedData.activities.map((act: Activity) => ({
        scheduleId: schedule[0].id,
        activityId: act.activityId,
        activityName: act.activityName,
        activityType: "Task",
        originalDuration: act.duration,
        remainingDuration: act.duration * (1 - (act.percentComplete || 0) / 100),
        startDate: act.startDate || "",
        finishDate: act.finishDate || "",
        totalFloat: act.totalFloat || 0,
        status: act.status,
        predecessors: Array.isArray(act.predecessors) ? act.predecessors.join(',') : '',
        successors: Array.isArray(act.successors) ? act.successors.join(',') : '',
        notes: act.wbs || null
      }));
      
      if (activityRecords.length > 0) {
        await dbStorage!.db.insert(scheduleActivities).values(activityRecords);
      }
      
      res.json({
        success: true,
        schedule: schedule[0],
        activitiesCount: parsedData.activities.length,
        projectInfo: parsedData.projectInfo,
        summary: parsedData.summary
      });
    } catch (error) {
      console.error("Error importing schedule:", error);
      res.status(500).json({ error: "Failed to import schedule file" });
    }
  });
  
  // Upload and process schedule file (legacy route for backward compatibility)
  app.post("/api/projects/:projectId/schedules/upload", async (req, res) => {
    if (!hasDbStorage) {
      return res.status(501).json({ error: "Schedule upload requires database storage" });
    }
    try {
      const { scheduleType, fileUrl, fileContent, dataDate } = req.body;
      
      // Parse the schedule content using AI
      const parsePrompt = `Parse this construction schedule and extract activities. For each activity, extract:
- Activity ID
- Activity Name  
- Activity Type (Milestone, Task, etc)
- Duration (original and remaining)
- Start and Finish dates
- Predecessors and Successors
- Total Float
- Status

Format as JSON array with these fields. Here's the schedule content:
${fileContent}`;

      const parseResponse = await poe.chat.completions.create({
        model: "Claude-Sonnet-4",
        messages: [
          { role: "system", content: "You are a construction schedule parser. Extract structured data from schedule files." },
          { role: "user", content: parsePrompt }
        ]
      });

      let activities = [];
      try {
        const content = parseResponse.choices[0].message.content || "[]";
        activities = JSON.parse(content);
      } catch {
        activities = [];
      }

      // Create schedule record
      const schedule = await dbStorage!.db.insert(projectSchedules).values({
        projectId: req.params.projectId,
        scheduleType: scheduleType || "CPM",
        dataDate: dataDate || new Date().toISOString().split('T')[0],
        startDate: activities[0]?.startDate || "",
        finishDate: activities[activities.length - 1]?.finishDate || "",
        fileUrl,
        version: 1,
        notes: `Uploaded ${scheduleType} schedule`
      }).returning();

      // Store activities
      if (activities.length > 0) {
        const activityRecords = activities.map((act: any) => ({
          scheduleId: schedule[0].id,
          activityId: act.activityId || act.id,
          activityName: act.activityName || act.name,
          activityType: act.activityType || act.type,
          originalDuration: parseInt(act.originalDuration) || 0,
          remainingDuration: parseInt(act.remainingDuration) || parseInt(act.originalDuration) || 0,
          startDate: act.startDate,
          finishDate: act.finishDate,
          totalFloat: parseInt(act.totalFloat) || 0,
          status: act.status || "Not Started",
          predecessors: act.predecessors,
          successors: act.successors,
          notes: null
        }));

        await dbStorage!.db.insert(scheduleActivities).values(activityRecords);
      }

      res.json({ 
        success: true, 
        schedule: schedule[0],
        activitiesCount: activities.length
      });
    } catch (error) {
      console.error("Error processing schedule:", error);
      res.status(500).json({ error: "Failed to process schedule" });
    }
  });

  // Generate 3-week lookahead from CPM schedule
  app.post("/api/projects/:projectId/schedules/generate-lookahead", async (req, res) => {
    if (!hasDbStorage) {
      return res.status(501).json({ error: "Lookahead generation requires database storage" });
    }
    try {
      const { baseScheduleId, startDate } = req.body;
      
      // Get base schedule activities
      const activities = await dbStorage!.db
        .select()
        .from(scheduleActivities)
        .where(eq(scheduleActivities.scheduleId, baseScheduleId));

      // Calculate 3-week window
      const start = new Date(startDate || new Date());
      const end = new Date(start);
      end.setDate(end.getDate() + 21);

      // Filter activities in 3-week window
      const lookaheadActivities = activities.filter(act => {
        const actStart = new Date(act.startDate || "");
        const actFinish = new Date(act.finishDate || "");
        return (actStart <= end && actFinish >= start);
      });

      // Create lookahead schedule
      const lookahead = await dbStorage!.db.insert(projectSchedules).values({
        projectId: req.params.projectId,
        scheduleType: "3_WEEK_LOOKAHEAD",
        dataDate: start.toISOString().split('T')[0],
        startDate: start.toISOString().split('T')[0],
        finishDate: end.toISOString().split('T')[0],
        version: 1,
        notes: "Generated from CPM schedule"
      }).returning();

      // Store lookahead activities
      if (lookaheadActivities.length > 0) {
        const lookaheadRecords = lookaheadActivities.map(act => ({
          scheduleId: lookahead[0].id,
          activityId: act.activityId,
          activityName: act.activityName,
          activityType: act.activityType,
          originalDuration: act.originalDuration,
          remainingDuration: act.remainingDuration,
          startDate: act.startDate,
          finishDate: act.finishDate,
          totalFloat: act.totalFloat,
          status: act.status,
          predecessors: act.predecessors,
          successors: act.successors,
          notes: act.notes
        }));

        await dbStorage!.db.insert(scheduleActivities).values(lookaheadRecords);
      }

      res.json({
        success: true,
        lookahead: lookahead[0],
        activitiesCount: lookaheadActivities.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate lookahead" });
    }
  });

  // AI-powered schedule update based on meeting discussion
  app.post("/api/meetings/:meetingId/update-schedule", async (req, res) => {
    if (!hasDbStorage) {
      return res.status(501).json({ error: "Schedule update requires database storage" });
    }
    try {
      const meeting = await storage.getMeeting(req.params.meetingId);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Get meeting agenda and action items
      const [agenda, actions] = await Promise.all([
        storage.getAgendaItemsByMeeting(meeting.id),
        storage.getActionItemsByMeeting(meeting.id)
      ]);

      // Get latest schedule for the project
      const schedules = await dbStorage!.db
        .select()
        .from(projectSchedules)
        .where(eq(projectSchedules.projectId, meeting.projectId))
        .orderBy(desc(projectSchedules.createdAt))
        .limit(1);

      if (schedules.length === 0) {
        return res.status(404).json({ error: "No schedule found for project" });
      }

      const schedule = schedules[0];
      const activities = await dbStorage!.db
        .select()
        .from(scheduleActivities)
        .where(eq(scheduleActivities.scheduleId, schedule.id));

      // Use AI to analyze meeting discussion and suggest schedule updates
      const scheduleAgenda = agenda.find(a => a.title === "Project Schedule");
      const updatePrompt = `Based on this meeting discussion, suggest schedule updates:

Meeting #${meeting.seqNum} - ${meeting.date}

Schedule Discussion:
${scheduleAgenda?.discussion || "No schedule discussion recorded"}

Action Items:
${actions.map(a => `- ${a.action} (Due: ${a.dueDate || 'TBD'})`).join('\n')}

Current Schedule Activities:
${activities.slice(0, 10).map(a => `${a.activityId}: ${a.activityName} (${a.status}, ${a.startDate} to ${a.finishDate})`).join('\n')}

Suggest specific updates to activities including:
- Status changes (Not Started -> In Progress -> Completed)
- Date adjustments based on delays or accelerations mentioned
- New dependencies or constraints
- Activities that need attention

Format as JSON with:
- updates: [{activityId, field, oldValue, newValue, reason}]
- recommendations: [text recommendations]`;

      const updateResponse = await poe.chat.completions.create({
        model: "Claude-Sonnet-4",
        messages: [
          { role: "system", content: "You are a construction schedule analyst. Suggest schedule updates based on meeting discussions." },
          { role: "user", content: updatePrompt }
        ]
      });

      let suggestions: { updates: any[], recommendations: string[] } = { updates: [], recommendations: [] };
      try {
        const content = updateResponse.choices[0].message.content || "{}";
        suggestions = JSON.parse(content);
      } catch {
        suggestions = { 
          updates: [], 
          recommendations: ["Unable to parse AI suggestions"] 
        };
      }

      // Apply suggested updates
      const appliedUpdates: any[] = [];
      for (const update of (suggestions.updates || []) as any[]) {
        const activity = activities.find(a => a.activityId === update.activityId);
        if (activity) {
          // Update the activity
          const updateData: any = {};
          updateData[update.field as string] = update.newValue;
          
          await dbStorage!.db
            .update(scheduleActivities)
            .set(updateData)
            .where(eq(scheduleActivities.id, activity.id));
          
          appliedUpdates.push(update);
        }
      }

      // Record the update
      if (appliedUpdates.length > 0 && dbStorage) {
        await dbStorage.db.insert(scheduleUpdates).values({
          scheduleId: schedule.id,
          meetingId: meeting.id,
          updateType: "AI_GENERATED",
          updateDescription: `Applied ${appliedUpdates.length} updates from Meeting #${meeting.seqNum}`,
          affectedActivities: JSON.stringify(appliedUpdates.map(u => u.activityId)),
          oldValues: JSON.stringify(appliedUpdates.map(u => ({ activityId: u.activityId, field: u.field, value: u.oldValue }))),
          newValues: JSON.stringify(appliedUpdates.map(u => ({ activityId: u.activityId, field: u.field, value: u.newValue }))),
          createdBy: "AI Assistant"
        });
      }

      res.json({
        success: true,
        appliedUpdates: appliedUpdates.length,
        suggestions: suggestions.recommendations,
        updates: appliedUpdates
      });
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ error: "Failed to update schedule" });
    }
  });

  // AI-powered schedule generation
  app.post("/api/projects/:projectId/schedules/generate-ai", async (req, res) => {
    try {
      const { type, projectDescription, currentActivities, userRequest, startDate, constraints, uploadedFiles } = req.body;
      
      console.log('Generating schedule with AI:', { type, projectDescription, uploadedFiles });
      
      const result = await generateScheduleWithAI({
        type,
        projectDescription,
        currentActivities,
        userRequest: userRequest || '',
        startDate,
        constraints,
        uploadedFiles
      });
      
      console.log('AI generation result:', { activitiesCount: result.activities.length });
      
      // If creating a new schedule and we have DB storage, save it
      if (type === 'create' && result.activities.length > 0 && hasDbStorage) {
        const schedule = await dbStorage!.db.insert(projectSchedules).values({
          projectId: req.params.projectId,
          scheduleType: "CPM",
          dataDate: startDate || new Date().toISOString().split('T')[0],
          startDate: startDate || new Date().toISOString().split('T')[0],
          finishDate: "", // Will be calculated
          version: 1,
          notes: `AI Generated: ${result.summary}`
        }).returning();
        
        // Store activities
        const activityRecords = result.activities.map((act: Activity) => ({
          scheduleId: schedule[0].id,
          activityId: act.activityId,
          activityName: act.activityName,
          activityType: "Task",
          originalDuration: act.duration,
          remainingDuration: act.duration,
          startDate: act.startDate || "",
          finishDate: act.finishDate || "",
          totalFloat: act.totalFloat || 0,
          status: act.status,
          predecessors: act.predecessors.join(','),
          successors: act.successors.join(','),
          notes: act.wbs || null
        }));
        
        await dbStorage!.db.insert(scheduleActivities).values(activityRecords);
        
        res.json({
          success: true,
          schedule: schedule[0],
          ...result
        });
      } else {
        // Return result without saving to database
        res.json({
          success: true,
          ...result
        });
      }
    } catch (error) {
      console.error("Error generating AI schedule:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        error: "Failed to generate schedule",
        details: errorMessage 
      });
    }
  });
  
  // Generate interactive 3-week lookahead
  app.post("/api/projects/:projectId/schedules/generate-lookahead-ai", async (req, res) => {
    if (!hasDbStorage) {
      return res.status(501).json({ error: "Lookahead AI generation requires database storage" });
    }
    try {
      const { currentActivities, startDate } = req.body;
      
      const result = await generateScheduleWithAI({
        type: 'lookahead',
        currentActivities,
        userRequest: 'Generate 3-week lookahead',
        startDate: startDate || new Date().toISOString().split('T')[0]
      });
      
      // Create lookahead schedule in database
      const lookahead = await dbStorage!.db.insert(projectSchedules).values({
        projectId: req.params.projectId,
        scheduleType: "3_WEEK_LOOKAHEAD",
        dataDate: startDate || new Date().toISOString().split('T')[0],
        startDate: startDate || new Date().toISOString().split('T')[0],
        finishDate: "", // Will be calculated
        version: 1,
        notes: `AI Generated Lookahead: ${result.summary}`
      }).returning();
      
      // Store lookahead activities
      if (result.activities.length > 0) {
        const activityRecords = result.activities.map((act: Activity) => ({
          scheduleId: lookahead[0].id,
          activityId: act.activityId,
          activityName: act.activityName,
          activityType: "Task",
          originalDuration: act.duration,
          remainingDuration: act.duration,
          startDate: act.startDate || "",
          finishDate: act.finishDate || "",
          totalFloat: act.totalFloat || 0,
          status: act.status,
          predecessors: act.predecessors.join(','),
          successors: act.successors.join(','),
          notes: act.wbs || null
        }));
        
        await dbStorage!.db.insert(scheduleActivities).values(activityRecords);
      }
      
      res.json({
        success: true,
        lookahead: lookahead[0],
        ...result
      });
    } catch (error) {
      console.error("Error generating AI lookahead:", error);
      res.status(500).json({ error: "Failed to generate lookahead" });
    }
  });
  
  // Get schedule activities
  app.get("/api/schedules/:scheduleId/activities", async (req, res) => {
    if (!hasDbStorage) {
      return res.json([]); // Return empty array for in-memory storage
    }
    try {
      const activities = await dbStorage!.db
        .select()
        .from(scheduleActivities)
        .where(eq(scheduleActivities.scheduleId, req.params.scheduleId))
        .orderBy(scheduleActivities.startDate);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });
  
  // Export schedule in various formats
  app.get("/api/schedules/:scheduleId/export/:format", async (req, res) => {
    if (!hasDbStorage) {
      return res.status(501).json({ error: "Schedule export requires database storage" });
    }
    try {
      const { scheduleId, format } = req.params;
      
      // Validate format
      if (!['xer', 'xml', 'pdf'].includes(format)) {
        return res.status(400).json({ error: "Invalid export format. Use xer, xml, or pdf" });
      }
      
      // Get schedule and activities
      const schedules = await dbStorage!.db
        .select()
        .from(projectSchedules)
        .where(eq(projectSchedules.id, scheduleId));
      
      if (schedules.length === 0) {
        return res.status(404).json({ error: "Schedule not found" });
      }
      
      const schedule = schedules[0];
      const activities = await dbStorage!.db
        .select()
        .from(scheduleActivities)
        .where(eq(scheduleActivities.scheduleId, scheduleId))
        .orderBy(scheduleActivities.startDate);
      
      // Get project name
      const projects = await dbStorage!.db
        .select()
        .from(dbStorage.schema.projects)
        .where(eq(dbStorage.schema.projects.id, schedule.projectId));
      
      const projectName = projects[0]?.name || 'Project';
      
      // Export schedule
      const exportResult = await exportSchedule(
        format as 'xer' | 'xml' | 'pdf',
        schedule,
        activities,
        projectName
      );
      
      // Set appropriate headers
      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
      
      // Send file content
      res.send(exportResult.content);
    } catch (error) {
      console.error("Error exporting schedule:", error);
      res.status(500).json({ error: "Failed to export schedule" });
    }
  });
}