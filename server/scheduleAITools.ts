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
  model?: string;
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
      "name": "Activity Name",
      "originalDuration": 5,  // IMPORTANT: Duration in DAYS as a number (e.g., 5 means 5 days, 10 means 10 days)
      "remainingDuration": 5,  // Same as originalDuration for new activities
      "predecessors": ["A000"],  // Array of activity IDs this depends on
      "status": "NotStarted",  // EXACT enum: "NotStarted", "InProgress", or "Completed"
      "percentComplete": 0,
      "earlyStart": "2025-01-15",  // Date string in YYYY-MM-DD format
      "earlyFinish": "2025-01-20",  // Date string in YYYY-MM-DD format
      "type": "Task",  // EXACT enum: "Task", "StartMilestone", "FinishMilestone", "LOE", "Hammock", "WBSSummary"
      "totalFloat": 0,  // Number of float days
      "freeFloat": 0,   // Number of free float days
      "isCritical": true,  // Boolean: true/false
      "wbs": "1.1.1",
      "resources": ["Resource1", "Resource2"]
    }
  ],
  "summary": "Brief summary of the schedule",
  "criticalPath": ["A001", "A003", "A007"],
  "recommendations": ["Consider adding weather contingency", "Review resource loading"]
}

IMPORTANT: 
- Duration must be a number in DAYS (not a string, not "0 days", just the number like 5, 10, 15)
- Include realistic durations based on construction standards
- Ensure all predecessor relationships are valid activity IDs`;

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
1. All major phases and activities (minimum 15-20 activities)
2. Realistic durations in DAYS (e.g., mobilization: 3 days, demolition: 20 days, etc.)
3. Proper predecessor relationships using activity IDs
4. Resource assignments
5. WBS structure
6. Critical path identification

Ensure each activity has a duration > 0 days as a number`;
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
    const aiModel = request.model || 'Claude-3-Haiku';
    console.log(`Sending request to AI model ${aiModel}...`);
    console.log('POE_API_KEY exists:', !!process.env.POE_API_KEY);
    console.log('API Key first 10 chars:', process.env.POE_API_KEY?.substring(0, 10));
    
    let response;
    try {
      console.log('Making POE API request to:', 'https://api.poe.com/v1/chat/completions');
      console.log('Using model:', aiModel);
      
      response = await poe.chat.completions.create({
        model: aiModel,
        messages: [
          { role: "system", content: SCHEDULE_SYSTEM_PROMPT },
          { role: "user", content: prompt }
        ]
      });
    } catch (apiError: any) {
      console.error('POE API Error:', apiError);
      console.error('POE API Error Message:', apiError.message);
      console.error('POE API Error Stack:', apiError.stack);
      
      // Check if we have a response body to log
      if (apiError.response && apiError.response.body) {
        try {
          const bodyText = await apiError.response.text();
          console.error('POE API Response Body:', bodyText.substring(0, 1000));
        } catch (e) {
          console.error('Could not read response body');
        }
      }
      
      // Return a simple demo schedule instead of failing completely
      const demoActivities = [
        {
          id: crypto.randomUUID(),
          activityId: "A001",
          activityName: "Site Preparation",
          duration: 5,
          predecessors: [],
          successors: ["A002"],
          status: "Not Started",
          percentComplete: 0,
          startDate: request.startDate || new Date().toISOString().split('T')[0],
          finishDate: new Date(new Date(request.startDate || new Date()).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          wbs: "1.1",
          resources: ["Crew A"],
          earlyStart: 0,
          earlyFinish: 5,
          lateStart: 0,
          lateFinish: 5,
          totalFloat: 0,
          freeFloat: 0,
          isCritical: true
        },
        {
          id: crypto.randomUUID(),
          activityId: "A002",
          activityName: "Foundation Work",
          duration: 10,
          predecessors: ["A001"],
          successors: ["A003"],
          status: "Not Started",
          percentComplete: 0,
          startDate: new Date(new Date(request.startDate || new Date()).getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          finishDate: new Date(new Date(request.startDate || new Date()).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          wbs: "1.2",
          resources: ["Crew B"],
          earlyStart: 5,
          earlyFinish: 15,
          lateStart: 5,
          lateFinish: 15,
          totalFloat: 0,
          freeFloat: 0,
          isCritical: true
        },
        {
          id: crypto.randomUUID(),
          activityId: "A003",
          activityName: "Structure Assembly",
          duration: 15,
          predecessors: ["A002"],
          successors: [],
          status: "Not Started",
          percentComplete: 0,
          startDate: new Date(new Date(request.startDate || new Date()).getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          finishDate: new Date(new Date(request.startDate || new Date()).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          wbs: "1.3",
          resources: ["Crew C"],
          earlyStart: 15,
          earlyFinish: 30,
          lateStart: 15,
          lateFinish: 30,
          totalFloat: 0,
          freeFloat: 0,
          isCritical: true
        }
      ];
      
      return {
        activities: demoActivities,
        summary: "Demo schedule generated (AI service temporarily unavailable)",
        criticalPath: ["A001", "A002", "A003"],
        recommendations: ["This is a demo schedule. The AI service is currently unavailable. Please check your POE API key in environment variables."]
      };
    }
    
    console.log('AI response received');
    
    let content = response.choices[0].message.content || "{}";
    
    // Remove any thinking prefix or non-JSON content before the actual JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    let result;
    try {
      result = JSON.parse(content);
      
      // Transform AI output to database format
      if (result.activities && Array.isArray(result.activities)) {
        result.activities = result.activities.map((activity: any) => ({
          // Map field names and fix data types
          activityId: activity.activityId || `ACT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          name: activity.name || activity.activityName || "Unnamed Activity",
          type: "Task",
          originalDuration: Number(activity.originalDuration || activity.duration) || 1,
          remainingDuration: Number(activity.remainingDuration || activity.duration) || 1,
          durationUnit: "days",
          earlyStart: String(activity.earlyStart || activity.startDate || new Date().toISOString().split('T')[0]),
          earlyFinish: String(activity.earlyFinish || activity.finishDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
          actualStart: null,
          actualFinish: null,
          constraintType: null,
          constraintDate: null,
          percentComplete: Number(activity.percentComplete) || 0,
          status: activity.status === "Not Started" ? "NotStarted" : 
                  activity.status === "In Progress" ? "InProgress" : 
                  activity.status === "Completed" ? "Completed" : "NotStarted",
          totalFloat: Number(activity.totalFloat) || 0,
          freeFloat: Number(activity.freeFloat) || 0,
          isCritical: Boolean(activity.isCritical) || false,
          responsibility: null,
          trade: null,
          // Keep other fields as-is
          predecessors: activity.predecessors || [],
          successors: activity.successors || [],
          wbs: activity.wbs || "1.0",
          resources: activity.resources || []
        }));
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', content.substring(0, 200));
      // Return a default structure if parsing fails
      result = {
        activities: [],
        summary: "Failed to parse AI response",
        recommendations: []
      };
    }
    
    // Process activities to ensure they have all required fields
    const activities = (result.activities || []).map((act: any, index: number) => {
      const duration = parseInt(act.duration) || 5; // Default 5 days if not specified
      const startDateStr = act.startDate || request.startDate || new Date().toISOString().split('T')[0];
      const startDate = new Date(startDateStr);
      const finishDate = new Date(startDate);
      finishDate.setDate(finishDate.getDate() + duration);
      
      return {
        id: crypto.randomUUID(),
        activityId: act.activityId || `A${(index + 1).toString().padStart(3, '0')}`,
        activityName: act.activityName || 'Unnamed Activity',
        duration: duration,
        predecessors: Array.isArray(act.predecessors) ? act.predecessors : [],
        successors: [],
        status: act.status || 'Not Started',
        percentComplete: act.percentComplete || 0,
        startDate: startDateStr,
        finishDate: finishDate.toISOString().split('T')[0],
        wbs: act.wbs || '',
        resources: act.resources || [],
        earlyStart: 0,
        earlyFinish: 0,
        lateStart: 0,
        lateFinish: 0,
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false
      };
    });
    
    // Calculate dates and CPM network
    // First pass: Calculate early dates (forward pass)
    activities.forEach((activity: Activity) => {
      if (activity.predecessors.length === 0) {
        // No predecessors - starts at project start
        activity.earlyStart = 0;
        activity.earlyFinish = activity.duration;
      } else {
        // Has predecessors - find latest finish of all predecessors
        let maxEarlyFinish = 0;
        activity.predecessors.forEach(predId => {
          const pred = activities.find((a: Activity) => a.activityId === predId);
          if (pred) {
            maxEarlyFinish = Math.max(maxEarlyFinish, pred.earlyFinish || 0);
          }
        });
        activity.earlyStart = maxEarlyFinish;
        activity.earlyFinish = activity.earlyStart + activity.duration;
      }
    });
    
    // Set successors and calculate late dates (backward pass)
    const projectFinish = Math.max(...activities.map((a: Activity) => a.earlyFinish || 0));
    
    // Initialize late dates for activities with no successors
    activities.forEach((activity: Activity) => {
      // Build successor relationships
      activity.predecessors.forEach(predId => {
        const pred = activities.find((a: Activity) => a.activityId === predId);
        if (pred && !pred.successors.includes(activity.activityId)) {
          pred.successors.push(activity.activityId);
        }
      });
    });
    
    // Calculate late dates
    activities.forEach((activity: Activity) => {
      if (activity.successors.length === 0) {
        // No successors - can finish at project end
        activity.lateFinish = projectFinish;
        activity.lateStart = activity.lateFinish - activity.duration;
      } else {
        // Has successors - find earliest start of all successors
        let minLateStart = projectFinish;
        activity.successors.forEach(succId => {
          const succ = activities.find((a: Activity) => a.activityId === succId);
          if (succ) {
            minLateStart = Math.min(minLateStart, succ.lateStart || projectFinish);
          }
        });
        activity.lateFinish = minLateStart;
        activity.lateStart = activity.lateFinish - activity.duration;
      }
      
      // Calculate float
      activity.totalFloat = (activity.lateStart || 0) - (activity.earlyStart || 0);
      activity.freeFloat = activity.totalFloat; // Simplified
    });
    
    // Mark critical path (activities with zero float)
    activities.forEach((activity: Activity) => {
      activity.isCritical = activity.totalFloat === 0;
    });
    
    // Build critical path array
    const criticalPath = activities
      .filter((a: Activity) => a.isCritical)
      .map((a: Activity) => a.activityId);
    
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
${currentSchedule.map((a: Activity) => `${a.activityId}: ${a.activityName} (${a.status})`).join('\n')}

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
      model: "Claude-Sonnet-4",  // Using Claude for better analysis
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