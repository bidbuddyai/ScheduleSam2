import { randomUUID } from "crypto";
import type {
  Project, InsertProject, Meeting, InsertMeeting, Attendance, InsertAttendance,
  AgendaItem, InsertAgendaItem, ActionItem, InsertActionItem, OpenItem, InsertOpenItem,
  Rfi, InsertRfi, Submittal, InsertSubmittal, Fabrication, InsertFabrication,
  Distribution, InsertDistribution, File, InsertFile, User, InsertUser,
  ProjectSchedule, InsertProjectSchedule, ScheduleActivity, InsertScheduleActivity,
  ScheduleUpdate, InsertScheduleUpdate
} from "@shared/schema";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  
  // Meetings
  getMeetingsByProject(projectId: string): Promise<Meeting[]>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  
  // Attendance
  getAttendanceByMeeting(meetingId: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, updates: Partial<Attendance>): Promise<Attendance | undefined>;
  
  // Agenda Items
  getAgendaItemsByMeeting(meetingId: string): Promise<AgendaItem[]>;
  createAgendaItem(item: InsertAgendaItem): Promise<AgendaItem>;
  updateAgendaItem(id: string, updates: Partial<AgendaItem>): Promise<AgendaItem | undefined>;
  
  // Action Items
  getActionItemsByMeeting(meetingId: string): Promise<ActionItem[]>;
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem | undefined>;
  deleteActionItem(id: string): Promise<boolean>;
  
  // Open Items
  getOpenItemsByProject(projectId: string): Promise<OpenItem[]>;
  createOpenItem(item: InsertOpenItem): Promise<OpenItem>;
  updateOpenItem(id: string, updates: Partial<OpenItem>): Promise<OpenItem | undefined>;
  
  // RFIs
  getRfisByMeeting(meetingId: string): Promise<Rfi[]>;
  createRfi(rfi: InsertRfi): Promise<Rfi>;
  updateRfi(id: string, updates: Partial<Rfi>): Promise<Rfi | undefined>;
  
  // Submittals
  getSubmittalsByMeeting(meetingId: string): Promise<Submittal[]>;
  createSubmittal(submittal: InsertSubmittal): Promise<Submittal>;
  updateSubmittal(id: string, updates: Partial<Submittal>): Promise<Submittal | undefined>;
  
  // Fabrication
  getFabricationByMeeting(meetingId: string): Promise<Fabrication[]>;
  createFabrication(fabrication: InsertFabrication): Promise<Fabrication>;
  updateFabrication(id: string, updates: Partial<Fabrication>): Promise<Fabrication | undefined>;
  
  // Distribution
  getDistributionByMeeting(meetingId: string): Promise<Distribution[]>;
  createDistribution(distribution: InsertDistribution): Promise<Distribution>;
  updateDistribution(id: string, updates: Partial<Distribution>): Promise<Distribution | undefined>;
  
  // Files
  getFilesByMeeting(meetingId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Project Schedules
  getSchedulesByProject(projectId: string): Promise<ProjectSchedule[]>;
  getSchedule(id: string): Promise<ProjectSchedule | undefined>;
  createSchedule(schedule: InsertProjectSchedule): Promise<ProjectSchedule>;
  updateSchedule(id: string, updates: Partial<ProjectSchedule>): Promise<ProjectSchedule | undefined>;
  deleteSchedule(id: string): Promise<boolean>;
  
  // Schedule Activities
  getActivitiesBySchedule(scheduleId: string): Promise<ScheduleActivity[]>;
  createScheduleActivity(activity: InsertScheduleActivity): Promise<ScheduleActivity>;
  updateScheduleActivity(id: string, updates: Partial<ScheduleActivity>): Promise<ScheduleActivity | undefined>;
  deleteScheduleActivities(scheduleId: string): Promise<boolean>;
  
  // Schedule Updates
  getScheduleUpdates(scheduleId: string): Promise<ScheduleUpdate[]>;
  createScheduleUpdate(update: InsertScheduleUpdate): Promise<ScheduleUpdate>;
}

export class MemStorage implements IStorage {
  private projects = new Map<string, Project>();
  private meetings = new Map<string, Meeting>();
  private attendance = new Map<string, Attendance>();
  private agendaItems = new Map<string, AgendaItem>();
  private actionItems = new Map<string, ActionItem>();
  private openItems = new Map<string, OpenItem>();
  private rfis = new Map<string, Rfi>();
  private submittals = new Map<string, Submittal>();
  private fabrication = new Map<string, Fabrication>();
  private distribution = new Map<string, Distribution>();
  private files = new Map<string, File>();
  private users = new Map<string, User>();
  private schedules = new Map<string, ProjectSchedule>();
  private scheduleActivities = new Map<string, ScheduleActivity>();
  private scheduleUpdates = new Map<string, ScheduleUpdate>();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Add a sample project
    const project: Project = {
      id: "project-1",
      name: "5-Story Office Building Demolition",
      colorPrimary: "#03512A",
      colorSecondary: "#1C7850",
      createdAt: new Date()
    };
    this.projects.set(project.id, project);
    
    // Add a sample meeting
    const meeting: Meeting = {
      id: "meeting-1",
      projectId: "project-1",
      seqNum: 1,
      date: "2025-01-15",
      time: "09:00 AM",
      location: "Project Site",
      preparedBy: "Project Manager",
      createdAt: new Date()
    };
    this.meetings.set(meeting.id, meeting);
    
    // Add sample agenda items
    const agendaTopics = [
      "Welcome & Introductions",
      "Site Safety",
      "Project Schedule",
      "Ongoing Project Details",
      "Open Discussion",
      "Action Items & Next Steps"
    ];
    
    agendaTopics.forEach((topic, index) => {
      const agendaItem: AgendaItem = {
        id: `agenda-${index + 1}`,
        meetingId: "meeting-1",
        topicOrder: index + 1,
        title: topic,
        discussion: "Discussion notes for " + topic,
        decision: ""
      };
      this.agendaItems.set(agendaItem.id, agendaItem);
    });
    
    // Add sample action items
    const actionItem1: ActionItem = {
      id: "action-1",
      meetingId: "meeting-1",
      agendaItemId: null,
      action: "Complete utility disconnection permits",
      owner: "John Smith",
      ballInCourt: "John Smith",
      dueDate: "2025-01-20",
      status: "Open",
      notes: "Critical for project start",
      sourceMeetingId: null
    };
    this.actionItems.set(actionItem1.id, actionItem1);
    
    const actionItem2: ActionItem = {
      id: "action-2",
      meetingId: "meeting-1",
      agendaItemId: null,
      action: "Schedule asbestos survey with certified contractor",
      owner: "Jane Doe",
      ballInCourt: "Jane Doe",
      dueDate: "2025-01-22",
      status: "Open",
      notes: "Required before abatement can begin",
      sourceMeetingId: null
    };
    this.actionItems.set(actionItem2.id, actionItem2);
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = { 
      ...insertProject, 
      id, 
      createdAt: new Date(),
      colorPrimary: insertProject.colorPrimary || "#03512A",
      colorSecondary: insertProject.colorSecondary || "#1C7850"
    };
    this.projects.set(id, project);
    return project;
  }

  // Meetings
  async getMeetingsByProject(projectId: string): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).filter(m => m.projectId === projectId);
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const id = randomUUID();
    const meeting: Meeting = { ...insertMeeting, id, createdAt: new Date() };
    this.meetings.set(id, meeting);
    return meeting;
  }

  // Attendance
  async getAttendanceByMeeting(meetingId: string): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(a => a.meetingId === meetingId);
  }

  async createAttendance(insertAttendance: InsertAttendance): Promise<Attendance> {
    const id = randomUUID();
    const attendance: Attendance = { 
      ...insertAttendance, 
      id,
      presentBool: insertAttendance.presentBool ?? false
    };
    this.attendance.set(id, attendance);
    return attendance;
  }

  async updateAttendance(id: string, updates: Partial<Attendance>): Promise<Attendance | undefined> {
    const existing = this.attendance.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.attendance.set(id, updated);
    return updated;
  }

  // Agenda Items
  async getAgendaItemsByMeeting(meetingId: string): Promise<AgendaItem[]> {
    return Array.from(this.agendaItems.values())
      .filter(a => a.meetingId === meetingId)
      .sort((a, b) => a.topicOrder - b.topicOrder);
  }

  async createAgendaItem(insertItem: InsertAgendaItem): Promise<AgendaItem> {
    const id = randomUUID();
    const item: AgendaItem = { 
      ...insertItem, 
      id,
      discussion: insertItem.discussion ?? null,
      decision: insertItem.decision ?? null
    };
    this.agendaItems.set(id, item);
    return item;
  }

  async updateAgendaItem(id: string, updates: Partial<AgendaItem>): Promise<AgendaItem | undefined> {
    const existing = this.agendaItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.agendaItems.set(id, updated);
    return updated;
  }

  // Action Items
  async getActionItemsByMeeting(meetingId: string): Promise<ActionItem[]> {
    return Array.from(this.actionItems.values()).filter(a => a.meetingId === meetingId);
  }

  async createActionItem(insertItem: InsertActionItem): Promise<ActionItem> {
    const id = randomUUID();
    const item: ActionItem = { 
      ...insertItem, 
      id,
      status: insertItem.status || "Open",
      agendaItemId: insertItem.agendaItemId ?? null,
      dueDate: insertItem.dueDate ?? null,
      notes: insertItem.notes ?? null,
      sourceMeetingId: insertItem.sourceMeetingId ?? null
    };
    this.actionItems.set(id, item);
    return item;
  }

  async updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem | undefined> {
    const existing = this.actionItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.actionItems.set(id, updated);
    return updated;
  }

  async deleteActionItem(id: string): Promise<boolean> {
    return this.actionItems.delete(id);
  }

  // Open Items
  async getOpenItemsByProject(projectId: string): Promise<OpenItem[]> {
    return Array.from(this.openItems.values()).filter(o => o.projectId === projectId);
  }

  async createOpenItem(insertItem: InsertOpenItem): Promise<OpenItem> {
    const id = randomUUID();
    const item: OpenItem = { 
      ...insertItem, 
      id,
      status: insertItem.status || "Open",
      notes: insertItem.notes ?? null,
      targetClose: insertItem.targetClose ?? null
    };
    this.openItems.set(id, item);
    return item;
  }

  async updateOpenItem(id: string, updates: Partial<OpenItem>): Promise<OpenItem | undefined> {
    const existing = this.openItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.openItems.set(id, updated);
    return updated;
  }

  // RFIs
  async getRfisByMeeting(meetingId: string): Promise<Rfi[]> {
    return Array.from(this.rfis.values()).filter(r => r.meetingId === meetingId);
  }

  async createRfi(insertRfi: InsertRfi): Promise<Rfi> {
    const id = randomUUID();
    const rfi: Rfi = { 
      ...insertRfi, 
      id,
      submittedDate: insertRfi.submittedDate ?? null,
      responseDue: insertRfi.responseDue ?? null,
      impact: insertRfi.impact ?? null,
      notes: insertRfi.notes ?? null
    };
    this.rfis.set(id, rfi);
    return rfi;
  }

  async updateRfi(id: string, updates: Partial<Rfi>): Promise<Rfi | undefined> {
    const existing = this.rfis.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.rfis.set(id, updated);
    return updated;
  }

  // Submittals
  async getSubmittalsByMeeting(meetingId: string): Promise<Submittal[]> {
    return Array.from(this.submittals.values()).filter(s => s.meetingId === meetingId);
  }

  async createSubmittal(insertSubmittal: InsertSubmittal): Promise<Submittal> {
    const id = randomUUID();
    const submittal: Submittal = { 
      ...insertSubmittal, 
      id,
      specSection: insertSubmittal.specSection ?? null,
      requiredDate: insertSubmittal.requiredDate ?? null,
      submittedDate: insertSubmittal.submittedDate ?? null,
      resubmittalNeededBool: insertSubmittal.resubmittalNeededBool ?? false
    };
    this.submittals.set(id, submittal);
    return submittal;
  }

  async updateSubmittal(id: string, updates: Partial<Submittal>): Promise<Submittal | undefined> {
    const existing = this.submittals.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.submittals.set(id, updated);
    return updated;
  }

  // Fabrication
  async getFabricationByMeeting(meetingId: string): Promise<Fabrication[]> {
    return Array.from(this.fabrication.values()).filter(f => f.meetingId === meetingId);
  }

  async createFabrication(insertFabrication: InsertFabrication): Promise<Fabrication> {
    const id = randomUUID();
    const fabrication: Fabrication = { 
      ...insertFabrication, 
      id,
      fabStart: insertFabrication.fabStart ?? null,
      fabFinish: insertFabrication.fabFinish ?? null,
      shipDate: insertFabrication.shipDate ?? null,
      needBy: insertFabrication.needBy ?? null,
      risks: insertFabrication.risks ?? null
    };
    this.fabrication.set(id, fabrication);
    return fabrication;
  }

  async updateFabrication(id: string, updates: Partial<Fabrication>): Promise<Fabrication | undefined> {
    const existing = this.fabrication.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.fabrication.set(id, updated);
    return updated;
  }

  // Distribution
  async getDistributionByMeeting(meetingId: string): Promise<Distribution[]> {
    return Array.from(this.distribution.values()).filter(d => d.meetingId === meetingId);
  }

  async createDistribution(insertDistribution: InsertDistribution): Promise<Distribution> {
    const id = randomUUID();
    const distribution: Distribution = { 
      ...insertDistribution, 
      id,
      sentBool: insertDistribution.sentBool ?? false
    };
    this.distribution.set(id, distribution);
    return distribution;
  }

  async updateDistribution(id: string, updates: Partial<Distribution>): Promise<Distribution | undefined> {
    const existing = this.distribution.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.distribution.set(id, updated);
    return updated;
  }

  // Files
  async getFilesByMeeting(meetingId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(f => f.meetingId === meetingId);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = { 
      ...insertFile, 
      id, 
      createdAt: new Date(),
      transcription: insertFile.transcription ?? null
    };
    this.files.set(id, file);
    return file;
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      role: insertUser.role || "Standard"
    };
    this.users.set(id, user);
    return user;
  }
  
  // Project Schedules
  async getSchedulesByProject(projectId: string): Promise<ProjectSchedule[]> {
    return Array.from(this.schedules.values())
      .filter(s => s.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getSchedule(id: string): Promise<ProjectSchedule | undefined> {
    return this.schedules.get(id);
  }
  
  async createSchedule(insertSchedule: InsertProjectSchedule): Promise<ProjectSchedule> {
    const id = randomUUID();
    const schedule: ProjectSchedule = {
      ...insertSchedule,
      id,
      version: insertSchedule.version || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      fileUrl: insertSchedule.fileUrl ?? null,
      notes: insertSchedule.notes ?? null
    };
    this.schedules.set(id, schedule);
    return schedule;
  }
  
  async updateSchedule(id: string, updates: Partial<ProjectSchedule>): Promise<ProjectSchedule | undefined> {
    const existing = this.schedules.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.schedules.set(id, updated);
    return updated;
  }
  
  async deleteSchedule(id: string): Promise<boolean> {
    // Delete associated activities first
    const activities = await this.getActivitiesBySchedule(id);
    activities.forEach(activity => {
      this.scheduleActivities.delete(activity.id);
    });
    return this.schedules.delete(id);
  }
  
  // Schedule Activities
  async getActivitiesBySchedule(scheduleId: string): Promise<ScheduleActivity[]> {
    return Array.from(this.scheduleActivities.values())
      .filter(a => a.scheduleId === scheduleId);
  }
  
  async createScheduleActivity(insertActivity: InsertScheduleActivity): Promise<ScheduleActivity> {
    const id = randomUUID();
    const activity: ScheduleActivity = {
      ...insertActivity,
      id,
      activityType: insertActivity.activityType ?? null,
      originalDuration: insertActivity.originalDuration ?? null,
      remainingDuration: insertActivity.remainingDuration ?? null,
      startDate: insertActivity.startDate ?? null,
      finishDate: insertActivity.finishDate ?? null,
      totalFloat: insertActivity.totalFloat ?? null,
      status: insertActivity.status ?? null,
      predecessors: insertActivity.predecessors ?? null,
      successors: insertActivity.successors ?? null,
      notes: insertActivity.notes ?? null
    };
    this.scheduleActivities.set(id, activity);
    return activity;
  }
  
  async updateScheduleActivity(id: string, updates: Partial<ScheduleActivity>): Promise<ScheduleActivity | undefined> {
    const existing = this.scheduleActivities.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.scheduleActivities.set(id, updated);
    return updated;
  }
  
  async deleteScheduleActivities(scheduleId: string): Promise<boolean> {
    const activities = await this.getActivitiesBySchedule(scheduleId);
    activities.forEach(activity => {
      this.scheduleActivities.delete(activity.id);
    });
    return true;
  }
  
  // Schedule Updates
  async getScheduleUpdates(scheduleId: string): Promise<ScheduleUpdate[]> {
    return Array.from(this.scheduleUpdates.values())
      .filter(u => u.scheduleId === scheduleId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async createScheduleUpdate(insertUpdate: InsertScheduleUpdate): Promise<ScheduleUpdate> {
    const id = randomUUID();
    const update: ScheduleUpdate = {
      ...insertUpdate,
      id,
      createdAt: new Date(),
      meetingId: insertUpdate.meetingId ?? null,
      affectedActivities: insertUpdate.affectedActivities ?? null,
      oldValues: insertUpdate.oldValues ?? null,
      newValues: insertUpdate.newValues ?? null,
      createdBy: insertUpdate.createdBy ?? null
    };
    this.scheduleUpdates.set(id, update);
    return update;
  }
}

// Use database storage if DATABASE_URL is set, otherwise use in-memory
// Commenting out DbStorage import since it doesn't exist yet
// import { DbStorage } from "./dbStorage";

// For now, use in-memory storage to ensure the app works
// Database connection seems to have issues in the current environment
export const storage = new MemStorage();

console.log('Using in-memory storage for development');
