import { poe } from "./poeClient";
import type { Activity } from "../client/src/components/ScheduleEditor";
import { ObjectStorageService } from "./objectStorage";

export interface ScheduleAIRequest {
  type: 'create' | 'update' | 'lookahead' | 'analyze';
  projectDescription?: string;
  currentActivities?: Activity[];
  userRequest: string;
  startDate?: string;
  constraints?: string[];
  uploadedFiles?: string[];
}

export interface ScheduleAIResponse {
  activities: Activity[];
  summary: string;
  criticalPath?: string[];
  recommendations?: string[];
}

// AI prompt for schedule operations
const SCHEDULE_SYSTEM_PROMPT = `You are a construction scheduling expert with deep knowledge of CPM (Critical Path Method) scheduling, similar to MS Project or Primavera P6.

When creating or modifying schedules:
1. Use realistic durations for construction activities
2. Establish proper predecessor/successor relationships (FS, SS, FF, SF)
3. Consider resource constraints and weather impacts
4. Follow construction sequencing logic (e.g., foundations before framing)
5. Include key milestones and deliverables
6. Account for permits, inspections, and approvals

For demolition projects specifically:
- Include hazmat surveys and abatement
- Account for utility disconnections
- Plan for debris removal and disposal
- Consider environmental controls
- Include site restoration

Return schedules as JSON with this structure:
{
  "activities": [
    {
      "activityId": "A001",
      "activityName": "Activity Name",
      "duration": 5,
      "predecessors": ["A000"],
      "status": "Not Started",
      "percentComplete": 0,
      "wbs": "1.1.1",
      "resources": ["Resource1", "Resource2"]
    }
  ],
  "summary": "Brief summary of the schedule",
  "criticalPath": ["A001", "A003", "A007"],
  "recommendations": ["Consider adding weather contingency", "Review resource loading"]
}`;

export async function generateScheduleWithAI(request: ScheduleAIRequest): Promise<ScheduleAIResponse> {
  // Read content from uploaded files if provided
  let uploadedContent = '';
  if (request.uploadedFiles && request.uploadedFiles.length > 0) {
    const objectStorage = new ObjectStorageService();
    const fileContents: string[] = [];
    
    for (const filePath of request.uploadedFiles) {
      try {
        const content = await objectStorage.readObjectContent(filePath);
        // Limit content to 5000 chars per file to avoid token limits
        fileContents.push(`\n--- Content from uploaded file ---\n${content.substring(0, 5000)}\n--- End of file ---\n`);
      } catch (error) {
        console.error(`Failed to read file ${filePath}:`, error);
      }
    }
    
    if (fileContents.length > 0) {
      uploadedContent = `\n\nUploaded Documents Content:\n${fileContents.join('\n')}`;
    }
  }
  
  let prompt = '';
  
  switch (request.type) {
    case 'create':
      prompt = `Create a CPM schedule for this project:
${request.projectDescription}${uploadedContent}

Start Date: ${request.startDate || 'Today'}
${request.constraints ? `Constraints: ${request.constraints.join(', ')}` : ''}

Generate a complete CPM schedule with:
1. All major phases and activities
2. Realistic durations based on project size
3. Proper predecessor relationships
4. Resource assignments
5. WBS structure
6. Critical path identification`;
      break;
      
    case 'update':
      prompt = `Update this schedule based on the request:
${request.userRequest}${uploadedContent}

Current activities:
${JSON.stringify(request.currentActivities, null, 2)}

Apply the requested changes and return the updated schedule.`;
      break;
      
    case 'lookahead':
      prompt = `Generate a 3-week lookahead schedule.
Start Date: ${request.startDate || 'Today'}${uploadedContent}

Filter activities that should be worked on in the next 3 weeks.
Current activities:
${JSON.stringify(request.currentActivities, null, 2)}`;
      break;
      
    case 'analyze':
      prompt = `Analyze this schedule and provide recommendations:
${request.userRequest}${uploadedContent}

Current schedule:
${JSON.stringify(request.currentActivities, null, 2)}

Provide:
1. Critical path analysis
2. Resource conflicts
3. Schedule optimization recommendations
4. Risk assessment`;
      break;
  }
  
  try {
    const response = await poe.chat.completions.create({
      model: "gemini-2.5-pro",
      messages: [
        { role: "system", content: SCHEDULE_SYSTEM_PROMPT },
        { role: "user", content: prompt }
      ]
    });
    
    const content = response.choices[0].message.content || "{}";
    const result = JSON.parse(content);
    
    // Process activities to ensure they have all required fields
    const activities = (result.activities || []).map((act: any, index: number) => ({
      id: crypto.randomUUID(),
      activityId: act.activityId || `A${(index + 1).toString().padStart(3, '0')}`,
      activityName: act.activityName || 'Unnamed Activity',
      duration: act.duration || 1,
      predecessors: act.predecessors || [],
      successors: [],
      status: act.status || 'Not Started',
      percentComplete: act.percentComplete || 0,
      startDate: act.startDate || request.startDate || new Date().toISOString().split('T')[0],
      finishDate: act.finishDate || '',
      wbs: act.wbs || '',
      resources: act.resources || [],
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: 0,
      lateFinish: 0,
      totalFloat: 0,
      freeFloat: 0,
      isCritical: false
    }));
    
    // Calculate CPM (simplified version)
    activities.forEach((activity: Activity) => {
      activity.earlyFinish = (activity.earlyStart || 0) + activity.duration;
    });
    
    // Set successors
    activities.forEach((activity: Activity) => {
      activity.predecessors.forEach(predId => {
        const pred = activities.find((a: Activity) => a.activityId === predId);
        if (pred && !pred.successors.includes(activity.activityId)) {
          pred.successors.push(activity.activityId);
        }
      });
    });
    
    // Mark critical path
    const criticalPath = result.criticalPath || [];
    activities.forEach((activity: Activity) => {
      activity.isCritical = criticalPath.includes(activity.activityId);
    });
    
    return {
      activities,
      summary: result.summary || `Generated ${activities.length} activities`,
      criticalPath,
      recommendations: result.recommendations || []
    };
  } catch (error) {
    console.error('Error generating schedule with AI:', error);
    throw new Error('Failed to generate schedule');
  }
}

export async function identifyScheduleImpacts(
  meetingNotes: string,
  currentSchedule: Activity[]
): Promise<{
  impactedActivities: string[];
  suggestedUpdates: Array<{
    activityId: string;
    field: string;
    newValue: any;
    reason: string;
  }>;
}> {
  const prompt = `Analyze these meeting notes and identify schedule impacts:

Meeting Notes:
${meetingNotes}

Current Schedule Activities:
${currentSchedule.map(a => `${a.activityId}: ${a.activityName} (${a.status})`).join('\n')}

Identify:
1. Which activities are mentioned or impacted
2. What updates should be made (status changes, date changes, etc.)
3. Reason for each update

Return as JSON:
{
  "impactedActivities": ["A001", "A002"],
  "suggestedUpdates": [
    {
      "activityId": "A001",
      "field": "status",
      "newValue": "In Progress",
      "reason": "Meeting notes indicate work has started"
    }
  ]
}`;

  try {
    const response = await poe.chat.completions.create({
      model: "gemini-2.5-pro",
      messages: [
        { role: "system", content: "You are a construction schedule analyst. Identify schedule impacts from meeting discussions." },
        { role: "user", content: prompt }
      ]
    });
    
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      impactedActivities: result.impactedActivities || [],
      suggestedUpdates: result.suggestedUpdates || []
    };
  } catch (error) {
    console.error('Error identifying schedule impacts:', error);
    return {
      impactedActivities: [],
      suggestedUpdates: []
    };
  }
}