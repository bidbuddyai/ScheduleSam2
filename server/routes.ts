import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, insertActivitySchema, insertWbsSchema,
  insertCalendarSchema, insertRelationshipSchema, insertResourceSchema,
  insertResourceAssignmentSchema, insertBaselineSchema, insertTiaScenarioSchema,
  insertScheduleUpdateSchema
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
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
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid project data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create project" });
      }
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.updateProject(req.params.id, req.body);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const success = await storage.deleteProject(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // WBS
  app.get("/api/projects/:projectId/wbs", async (req, res) => {
    try {
      const wbs = await storage.getWbsByProject(req.params.projectId);
      res.json(wbs);
    } catch (error) {
      console.error("Error fetching WBS:", error);
      res.status(500).json({ error: "Failed to fetch WBS" });
    }
  });

  app.post("/api/projects/:projectId/wbs", async (req, res) => {
    try {
      const wbsData = insertWbsSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const wbs = await storage.createWbs(wbsData);
      res.json(wbs);
    } catch (error) {
      console.error("Error creating WBS:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid WBS data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create WBS" });
      }
    }
  });

  app.put("/api/wbs/:id", async (req, res) => {
    try {
      const wbs = await storage.updateWbs(req.params.id, req.body);
      if (!wbs) {
        return res.status(404).json({ error: "WBS not found" });
      }
      res.json(wbs);
    } catch (error) {
      console.error("Error updating WBS:", error);
      res.status(500).json({ error: "Failed to update WBS" });
    }
  });

  app.delete("/api/wbs/:id", async (req, res) => {
    try {
      const success = await storage.deleteWbs(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "WBS not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting WBS:", error);
      res.status(500).json({ error: "Failed to delete WBS" });
    }
  });

  // Activities
  app.get("/api/projects/:projectId/activities", async (req, res) => {
    try {
      const activities = await storage.getActivitiesByProject(req.params.projectId);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/:id", async (req, res) => {
    try {
      const activity = await storage.getActivity(req.params.id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  app.post("/api/projects/:projectId/activities", async (req, res) => {
    try {
      const activityData = insertActivitySchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const activity = await storage.createActivity(activityData);
      res.json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid activity data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create activity" });
      }
    }
  });

  app.put("/api/activities/:id", async (req, res) => {
    try {
      const activity = await storage.updateActivity(req.params.id, req.body);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      console.error("Error updating activity:", error);
      res.status(500).json({ error: "Failed to update activity" });
    }
  });

  app.delete("/api/activities/:id", async (req, res) => {
    try {
      const success = await storage.deleteActivity(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ error: "Failed to delete activity" });
    }
  });

  app.post("/api/projects/:projectId/activities/bulk-update", async (req, res) => {
    try {
      const { updates } = req.body;
      await storage.bulkUpdateActivities(updates);
      res.json({ success: true });
    } catch (error) {
      console.error("Error bulk updating activities:", error);
      res.status(500).json({ error: "Failed to bulk update activities" });
    }
  });

  // Relationships
  app.get("/api/projects/:projectId/relationships", async (req, res) => {
    try {
      const relationships = await storage.getRelationshipsByProject(req.params.projectId);
      res.json(relationships);
    } catch (error) {
      console.error("Error fetching relationships:", error);
      res.status(500).json({ error: "Failed to fetch relationships" });
    }
  });

  app.get("/api/activities/:activityId/relationships", async (req, res) => {
    try {
      const relationships = await storage.getRelationshipsForActivity(req.params.activityId);
      res.json(relationships);
    } catch (error) {
      console.error("Error fetching activity relationships:", error);
      res.status(500).json({ error: "Failed to fetch activity relationships" });
    }
  });

  app.post("/api/projects/:projectId/relationships", async (req, res) => {
    try {
      const relationshipData = insertRelationshipSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const relationship = await storage.createRelationship(relationshipData);
      res.json(relationship);
    } catch (error) {
      console.error("Error creating relationship:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid relationship data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create relationship" });
      }
    }
  });

  app.put("/api/relationships/:id", async (req, res) => {
    try {
      const relationship = await storage.updateRelationship(req.params.id, req.body);
      if (!relationship) {
        return res.status(404).json({ error: "Relationship not found" });
      }
      res.json(relationship);
    } catch (error) {
      console.error("Error updating relationship:", error);
      res.status(500).json({ error: "Failed to update relationship" });
    }
  });

  app.delete("/api/relationships/:id", async (req, res) => {
    try {
      const success = await storage.deleteRelationship(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Relationship not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting relationship:", error);
      res.status(500).json({ error: "Failed to delete relationship" });
    }
  });

  // Calendars
  app.get("/api/projects/:projectId/calendars", async (req, res) => {
    try {
      const calendars = await storage.getCalendarsByProject(req.params.projectId);
      res.json(calendars);
    } catch (error) {
      console.error("Error fetching calendars:", error);
      res.status(500).json({ error: "Failed to fetch calendars" });
    }
  });

  app.get("/api/calendars/global", async (req, res) => {
    try {
      const calendars = await storage.getCalendarsByProject(null);
      res.json(calendars);
    } catch (error) {
      console.error("Error fetching global calendars:", error);
      res.status(500).json({ error: "Failed to fetch global calendars" });
    }
  });

  app.post("/api/calendars", async (req, res) => {
    try {
      const calendarData = insertCalendarSchema.parse(req.body);
      const calendar = await storage.createCalendar(calendarData);
      res.json(calendar);
    } catch (error) {
      console.error("Error creating calendar:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid calendar data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create calendar" });
      }
    }
  });

  app.put("/api/calendars/:id", async (req, res) => {
    try {
      const calendar = await storage.updateCalendar(req.params.id, req.body);
      if (!calendar) {
        return res.status(404).json({ error: "Calendar not found" });
      }
      res.json(calendar);
    } catch (error) {
      console.error("Error updating calendar:", error);
      res.status(500).json({ error: "Failed to update calendar" });
    }
  });

  app.delete("/api/calendars/:id", async (req, res) => {
    try {
      const success = await storage.deleteCalendar(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Calendar not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting calendar:", error);
      res.status(500).json({ error: "Failed to delete calendar" });
    }
  });

  // Resources
  app.get("/api/projects/:projectId/resources", async (req, res) => {
    try {
      const resources = await storage.getResourcesByProject(req.params.projectId);
      res.json(resources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ error: "Failed to fetch resources" });
    }
  });

  app.post("/api/projects/:projectId/resources", async (req, res) => {
    try {
      const resourceData = insertResourceSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const resource = await storage.createResource(resourceData);
      res.json(resource);
    } catch (error) {
      console.error("Error creating resource:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid resource data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create resource" });
      }
    }
  });

  app.put("/api/resources/:id", async (req, res) => {
    try {
      const resource = await storage.updateResource(req.params.id, req.body);
      if (!resource) {
        return res.status(404).json({ error: "Resource not found" });
      }
      res.json(resource);
    } catch (error) {
      console.error("Error updating resource:", error);
      res.status(500).json({ error: "Failed to update resource" });
    }
  });

  app.delete("/api/resources/:id", async (req, res) => {
    try {
      const success = await storage.deleteResource(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Resource not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting resource:", error);
      res.status(500).json({ error: "Failed to delete resource" });
    }
  });

  // Resource Assignments
  app.get("/api/activities/:activityId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByActivity(req.params.activityId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({ error: "Failed to fetch assignments" });
    }
  });

  app.get("/api/resources/:resourceId/assignments", async (req, res) => {
    try {
      const assignments = await storage.getAssignmentsByResource(req.params.resourceId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching resource assignments:", error);
      res.status(500).json({ error: "Failed to fetch resource assignments" });
    }
  });

  app.post("/api/assignments", async (req, res) => {
    try {
      const assignmentData = insertResourceAssignmentSchema.parse(req.body);
      const assignment = await storage.createAssignment(assignmentData);
      res.json(assignment);
    } catch (error) {
      console.error("Error creating assignment:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid assignment data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create assignment" });
      }
    }
  });

  app.put("/api/assignments/:id", async (req, res) => {
    try {
      const assignment = await storage.updateAssignment(req.params.id, req.body);
      if (!assignment) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json(assignment);
    } catch (error) {
      console.error("Error updating assignment:", error);
      res.status(500).json({ error: "Failed to update assignment" });
    }
  });

  app.delete("/api/assignments/:id", async (req, res) => {
    try {
      const success = await storage.deleteAssignment(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting assignment:", error);
      res.status(500).json({ error: "Failed to delete assignment" });
    }
  });

  // Baselines
  app.get("/api/projects/:projectId/baselines", async (req, res) => {
    try {
      const baselines = await storage.getBaselinesByProject(req.params.projectId);
      res.json(baselines);
    } catch (error) {
      console.error("Error fetching baselines:", error);
      res.status(500).json({ error: "Failed to fetch baselines" });
    }
  });

  app.post("/api/projects/:projectId/baselines", async (req, res) => {
    try {
      const baselineData = insertBaselineSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const baseline = await storage.createBaseline(baselineData);
      res.json(baseline);
    } catch (error) {
      console.error("Error creating baseline:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid baseline data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create baseline" });
      }
    }
  });

  app.put("/api/projects/:projectId/baselines/:id/activate", async (req, res) => {
    try {
      await storage.setActiveBaseline(req.params.projectId, req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error activating baseline:", error);
      res.status(500).json({ error: "Failed to activate baseline" });
    }
  });

  app.delete("/api/baselines/:id", async (req, res) => {
    try {
      const success = await storage.deleteBaseline(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Baseline not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting baseline:", error);
      res.status(500).json({ error: "Failed to delete baseline" });
    }
  });

  app.get("/api/projects/:projectId/variance", async (req, res) => {
    try {
      const { baselineId } = req.query;
      const variance = await storage.calculateVariance(req.params.projectId, baselineId as string);
      res.json(variance);
    } catch (error) {
      console.error("Error calculating variance:", error);
      res.status(500).json({ error: "Failed to calculate variance" });
    }
  });

  // TIA Scenarios
  app.get("/api/projects/:projectId/tia-scenarios", async (req, res) => {
    try {
      const scenarios = await storage.getTiaScenariosByProject(req.params.projectId);
      res.json(scenarios);
    } catch (error) {
      console.error("Error fetching TIA scenarios:", error);
      res.status(500).json({ error: "Failed to fetch TIA scenarios" });
    }
  });

  app.get("/api/tia-scenarios/:id", async (req, res) => {
    try {
      const scenario = await storage.getTiaScenario(req.params.id);
      if (!scenario) {
        return res.status(404).json({ error: "TIA scenario not found" });
      }
      res.json(scenario);
    } catch (error) {
      console.error("Error fetching TIA scenario:", error);
      res.status(500).json({ error: "Failed to fetch TIA scenario" });
    }
  });

  app.post("/api/projects/:projectId/tia-scenarios", async (req, res) => {
    try {
      const scenarioData = insertTiaScenarioSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const scenario = await storage.createTiaScenario(scenarioData);
      res.json(scenario);
    } catch (error) {
      console.error("Error creating TIA scenario:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid TIA scenario data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create TIA scenario" });
      }
    }
  });

  app.put("/api/tia-scenarios/:id", async (req, res) => {
    try {
      const scenario = await storage.updateTiaScenario(req.params.id, req.body);
      if (!scenario) {
        return res.status(404).json({ error: "TIA scenario not found" });
      }
      res.json(scenario);
    } catch (error) {
      console.error("Error updating TIA scenario:", error);
      res.status(500).json({ error: "Failed to update TIA scenario" });
    }
  });

  app.delete("/api/tia-scenarios/:id", async (req, res) => {
    try {
      const success = await storage.deleteTiaScenario(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "TIA scenario not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting TIA scenario:", error);
      res.status(500).json({ error: "Failed to delete TIA scenario" });
    }
  });

  // Schedule Updates
  app.get("/api/projects/:projectId/schedule-updates", async (req, res) => {
    try {
      const updates = await storage.getScheduleUpdatesByProject(req.params.projectId);
      res.json(updates);
    } catch (error) {
      console.error("Error fetching schedule updates:", error);
      res.status(500).json({ error: "Failed to fetch schedule updates" });
    }
  });

  app.post("/api/projects/:projectId/schedule-updates", async (req, res) => {
    try {
      const updateData = insertScheduleUpdateSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });
      const update = await storage.createScheduleUpdate(updateData);
      res.json(update);
    } catch (error) {
      console.error("Error creating schedule update:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid schedule update data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create schedule update" });
      }
    }
  });

  // CPM Calculation Engine - Advanced Scheduling Features
  app.post("/api/projects/:projectId/calculate-schedule", async (req, res) => {
    try {
      const { retainedLogic = true, dataDate } = req.body;
      
      // Get all project data needed for CPM calculation
      const activities = await storage.getActivitiesByProject(req.params.projectId);
      const relationships = await storage.getRelationshipsByProject(req.params.projectId);
      const calendars = await storage.getCalendarsByProject(req.params.projectId);
      
      // Import CPM calculator
      const { CPMCalculator } = require("./cpmCalculator");
      
      // Create calculator instance with project data
      const calculator = new CPMCalculator(
        activities,
        relationships,
        calendars,
        dataDate ? new Date(dataDate) : undefined,
        retainedLogic
      );
      
      // Run comprehensive CPM calculation with advanced features
      const results = calculator.calculate();
      
      res.json({
        success: true,
        results: {
          activities: results.activities,
          criticalPath: results.criticalPath,
          projectDuration: results.projectDuration,
          constraintViolations: results.constraintViolations,
          scheduleMetrics: results.scheduleMetrics,
          retainedLogic,
          calculatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error calculating schedule:", error);
      res.status(500).json({ error: "Failed to calculate schedule", details: error.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", service: "ScheduleSam API" });
  });

  const httpServer = createServer(app);
  return httpServer;
}