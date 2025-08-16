import { poe } from "./poeClient";
import type { Activity } from "../client/src/components/ScheduleEditor";

export interface ScheduleAIRequest {
  type: 'create' | 'update' | 'lookahead' | 'analyze';
  projectDescription?: string;
  currentActivities?: Activity[];
  userRequest: string;
  startDate?: string;
  constraints?: string[];
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
  "summary": "Brief description of the schedule",
  "criticalPath": ["A001", "A003", "A007"],
  "recommendations": ["Consider adding float to critical activities", "Weather window concern for exterior work"]
}`;

export async function generateScheduleWithAI(request: ScheduleAIRequest): Promise<ScheduleAIResponse> {
  let prompt = '';
  
  switch (request.type) {
    case 'create':
      prompt = `Create a CPM schedule for this project:
${request.projectDescription}

Start Date: ${request.startDate || 'Today'}
${request.constraints ? `Constraints: ${request.constraints.join(', ')}` : ''}

User Request: ${request.userRequest}

Generate a complete CPM schedule with all activities, durations, and predecessor relationships.
Include WBS codes and resource assignments.`;
      break;
      
    case 'update':
      prompt = `Update this CPM schedule based on the user's request:

Current Activities:
${JSON.stringify(request.currentActivities, null, 2)}

User Request: ${request.userRequest}

Modify the schedule as requested. Maintain all predecessor relationships and recalculate the critical path.`;
      break;
      
    case 'lookahead':
      prompt = `Generate a 3-week lookahead schedule from this CPM schedule:

Current Activities:
${JSON.stringify(request.currentActivities, null, 2)}

Start Date for Lookahead: ${request.startDate || 'Today'}

Filter and organize activities for the next 3 weeks. Include:
- Activities starting or ongoing in the 3-week window
- Predecessor constraints that may impact the window
- Resource requirements and potential conflicts
- Recommended focus areas`;
      break;
      
    case 'analyze':
      prompt = `Analyze this CPM schedule and provide recommendations:

Current Activities:
${JSON.stringify(request.currentActivities, null, 2)}

User Request: ${request.userRequest}

Analyze for:
- Critical path optimization
- Resource leveling opportunities  
- Risk mitigation strategies
- Schedule compression options
- Potential delays or conflicts`;
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
    
    // Parse the response
    let result: ScheduleAIResponse;
    try {
      result = JSON.parse(content);
      
      // Ensure all activities have required fields
      result.activities = result.activities.map((act: any, index: number) => ({
        id: act.id || crypto.randomUUID(),
        activityId: act.activityId || `A${(index + 1).toString().padStart(3, '0')}`,
        activityName: act.activityName || 'Unnamed Activity',
        duration: act.duration || 1,
        predecessors: act.predecessors || [],
        successors: [],
        status: act.status || 'Not Started',
        percentComplete: act.percentComplete || 0,
        wbs: act.wbs || '',
        resources: act.resources || []
      }));
      
    } catch (parseError) {
      // If parsing fails, return a default response
      result = {
        activities: [],
        summary: content,
        recommendations: ["Unable to parse schedule. Please try again with a more specific request."]
      };
    }
    
    return result;
  } catch (error) {
    console.error("Error generating schedule with AI:", error);
    throw error;
  }
}

// Helper function to convert activities to text format for meeting updates
export function activitiesToText(activities: Activity[]): string {
  return activities.map(act => 
    `${act.activityId}: ${act.activityName} (${act.duration}d, ${act.status}, ${act.percentComplete}% complete)`
  ).join('\n');
}

// Helper function to identify schedule impacts from meeting discussion
export async function identifyScheduleImpacts(
  meetingDiscussion: string,
  currentActivities: Activity[]
): Promise<{
  impactedActivities: string[];
  suggestedChanges: Array<{
    activityId: string;
    field: string;
    newValue: any;
    reason: string;
  }>;
}> {
  const prompt = `Analyze this meeting discussion for schedule impacts:

Meeting Discussion:
${meetingDiscussion}

Current Schedule Activities:
${activitiesToText(currentActivities)}

Identify:
1. Which activities are impacted
2. What changes should be made (status, duration, dates)
3. Reasoning for each change

Return as JSON:
{
  "impactedActivities": ["A001", "A002"],
  "suggestedChanges": [
    {
      "activityId": "A001",
      "field": "status",
      "newValue": "In Progress",
      "reason": "Team reported starting foundation work"
    }
  ]
}`;

  const response = await poe.chat.completions.create({
    model: "gemini-2.5-pro",
    messages: [
      { role: "system", content: "You are a construction schedule analyst. Identify schedule impacts from meeting discussions." },
      { role: "user", content: prompt }
    ]
  });
  
  try {
    const content = response.choices[0].message.content || "{}";
    return JSON.parse(content);
  } catch {
    return {
      impactedActivities: [],
      suggestedChanges: []
    };
  }
}