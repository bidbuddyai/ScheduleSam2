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

export function registerScheduleRoutes(app: Express) {
  // Only use schedule routes if we have database storage
  if (!(storage instanceof DbStorage)) {
    console.log("Schedule routes require database storage");
    return;
  }
  
  const dbStorage = storage as DbStorage;

  // Get project schedules
  app.get("/api/projects/:projectId/schedules", async (req, res) => {
    try {
      const schedules = await dbStorage.db
        .select()
        .from(projectSchedules)
        .where(eq(projectSchedules.projectId, req.params.projectId))
        .orderBy(desc(projectSchedules.createdAt));
      res.json(schedules);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  // Upload and process schedule file
  app.post("/api/projects/:projectId/schedules/upload", async (req, res) => {
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
        model: "gemini-2.5-pro",
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
      const schedule = await dbStorage.db.insert(projectSchedules).values({
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

        await dbStorage.db.insert(scheduleActivities).values(activityRecords);
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
    try {
      const { baseScheduleId, startDate } = req.body;
      
      // Get base schedule activities
      const activities = await dbStorage.db
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
      const lookahead = await dbStorage.db.insert(projectSchedules).values({
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

        await dbStorage.db.insert(scheduleActivities).values(lookaheadRecords);
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
      const schedules = await dbStorage.db
        .select()
        .from(projectSchedules)
        .where(eq(projectSchedules.projectId, meeting.projectId))
        .orderBy(desc(projectSchedules.createdAt))
        .limit(1);

      if (schedules.length === 0) {
        return res.status(404).json({ error: "No schedule found for project" });
      }

      const schedule = schedules[0];
      const activities = await dbStorage.db
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
        model: "gemini-2.5-pro",
        messages: [
          { role: "system", content: "You are a construction schedule analyst. Suggest schedule updates based on meeting discussions." },
          { role: "user", content: updatePrompt }
        ]
      });

      let suggestions = { updates: [], recommendations: [] };
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
          
          await dbStorage.db
            .update(scheduleActivities)
            .set(updateData)
            .where(eq(scheduleActivities.id, activity.id));
          
          appliedUpdates.push(update);
        }
      }

      // Record the update
      if (appliedUpdates.length > 0) {
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

  // Get schedule activities
  app.get("/api/schedules/:scheduleId/activities", async (req, res) => {
    try {
      const activities = await dbStorage.db
        .select()
        .from(scheduleActivities)
        .where(eq(scheduleActivities.scheduleId, req.params.scheduleId))
        .orderBy(scheduleActivities.startDate);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });
}