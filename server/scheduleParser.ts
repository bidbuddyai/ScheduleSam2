import { poe } from "./poeClient";
import type { Activity } from "../client/src/components/ScheduleEditor";

interface ParsedScheduleData {
  activities: Activity[];
  projectInfo: {
    name?: string;
    startDate?: string;
    finishDate?: string;
    dataDate?: string;
    calendarName?: string;
  };
  summary: string;
}

// XER Parser for Primavera P6 files
export class XERParser {
  private tables: Map<string, any[]> = new Map();
  private columns: Map<string, string[]> = new Map();
  
  parse(content: string): ParsedScheduleData {
    const lines = content.split('\n');
    let currentTable = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('ERMHDR')) continue;
      
      // Table definition
      if (trimmed.startsWith('%T')) {
        currentTable = trimmed.substring(3);
        this.tables.set(currentTable, []);
      }
      // Column definition
      else if (trimmed.startsWith('%F')) {
        const cols = trimmed.substring(3).split('\t');
        this.columns.set(currentTable, cols);
      }
      // Row data
      else if (trimmed.startsWith('%R') && currentTable) {
        const values = trimmed.substring(3).split('\t');
        const cols = this.columns.get(currentTable) || [];
        const row: any = {};
        cols.forEach((col, idx) => {
          row[col] = values[idx] || '';
        });
        this.tables.get(currentTable)?.push(row);
      }
    }
    
    // Extract activities from TASK table
    const tasks = this.tables.get('TASK') || [];
    const taskpred = this.tables.get('TASKPRED') || [];
    
    // Build predecessor map
    const predMap = new Map<string, string[]>();
    taskpred.forEach(pred => {
      const taskId = pred.task_id;
      const predId = pred.pred_task_id;
      if (!predMap.has(taskId)) {
        predMap.set(taskId, []);
      }
      predMap.get(taskId)?.push(predId);
    });
    
    // Convert to our Activity format
    const activities: Activity[] = tasks.map((task, index) => ({
      id: crypto.randomUUID(),
      activityId: task.task_code || task.task_id || `A${(index + 1).toString().padStart(3, '0')}`,
      activityName: task.task_name || 'Unnamed Activity',
      duration: parseInt(task.target_drtn_hr_cnt) / 8 || parseInt(task.remain_drtn_hr_cnt) / 8 || 1,
      predecessors: predMap.get(task.task_id) || [],
      successors: [],
      status: this.mapStatus(task.status_code),
      percentComplete: parseFloat(task.phys_complete_pct) || 0,
      startDate: this.formatDate(task.target_start_date || task.act_start_date),
      finishDate: this.formatDate(task.target_end_date || task.act_end_date),
      wbs: task.wbs_id || '',
      resources: [],
      totalFloat: parseFloat(task.total_float_hr_cnt) / 8 || 0,
      freeFloat: parseFloat(task.free_float_hr_cnt) / 8 || 0
    }));
    
    // Extract project info
    const project = this.tables.get('PROJECT')?.[0] || {};
    
    return {
      activities,
      projectInfo: {
        name: project.proj_short_name,
        startDate: this.formatDate(project.plan_start_date),
        finishDate: this.formatDate(project.plan_end_date),
        dataDate: this.formatDate(project.last_recalc_date)
      },
      summary: `Imported P6 schedule with ${activities.length} activities`
    };
  }
  
  private mapStatus(statusCode: string): Activity['status'] {
    switch (statusCode) {
      case 'TK_Complete': return 'Completed';
      case 'TK_Active': return 'In Progress';
      default: return 'Not Started';
    }
  }
  
  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    // P6 date format: YYYY-MM-DD HH:MM
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  }
}

// MS Project XML Parser (MPX/MSPDI format)
export class MSProjectXMLParser {
  parse(content: string): ParsedScheduleData {
    // Parse XML content
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/xml');
    
    const tasks = doc.getElementsByTagName('Task');
    const activities: Activity[] = [];
    const taskMap = new Map<string, Activity>();
    
    // First pass: create activities
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskId = this.getElementText(task, 'UID');
      const wbs = this.getElementText(task, 'WBS');
      const outlineLevel = parseInt(this.getElementText(task, 'OutlineLevel')) || 0;
      
      // Skip summary tasks (outline level 0 or has subtasks)
      if (outlineLevel === 0 || this.getElementText(task, 'Summary') === '1') {
        continue;
      }
      
      const activity: Activity = {
        id: crypto.randomUUID(),
        activityId: this.getElementText(task, 'ID') || `A${(i + 1).toString().padStart(3, '0')}`,
        activityName: this.getElementText(task, 'Name') || 'Unnamed Activity',
        duration: parseInt(this.getElementText(task, 'Duration')?.replace(/[^\d]/g, '')) / 8 || 1,
        predecessors: [],
        successors: [],
        status: this.mapMSPStatus(parseInt(this.getElementText(task, 'PercentComplete'))),
        percentComplete: parseInt(this.getElementText(task, 'PercentComplete')) || 0,
        startDate: this.formatMSPDate(this.getElementText(task, 'Start')),
        finishDate: this.formatMSPDate(this.getElementText(task, 'Finish')),
        wbs: wbs || '',
        resources: this.extractResources(task),
        earlyStart: parseInt(this.getElementText(task, 'EarlyStart')) || 0,
        earlyFinish: parseInt(this.getElementText(task, 'EarlyFinish')) || 0,
        lateStart: parseInt(this.getElementText(task, 'LateStart')) || 0,
        lateFinish: parseInt(this.getElementText(task, 'LateFinish')) || 0,
        totalFloat: parseInt(this.getElementText(task, 'TotalSlack')) / 480 || 0, // Convert minutes to days
        isCritical: this.getElementText(task, 'Critical') === '1'
      };
      
      activities.push(activity);
      taskMap.set(taskId, activity);
    }
    
    // Second pass: set up predecessors
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskId = this.getElementText(task, 'UID');
      const activity = taskMap.get(taskId);
      if (!activity) continue;
      
      const predecessorLinks = task.getElementsByTagName('PredecessorLink');
      for (let j = 0; j < predecessorLinks.length; j++) {
        const predLink = predecessorLinks[j];
        const predUID = this.getElementText(predLink, 'PredecessorUID');
        const predActivity = taskMap.get(predUID);
        if (predActivity) {
          activity.predecessors.push(predActivity.activityId);
          predActivity.successors.push(activity.activityId);
        }
      }
    }
    
    // Extract project info
    const projectNode = doc.getElementsByTagName('Project')[0];
    const projectInfo = {
      name: this.getElementText(projectNode, 'Title') || this.getElementText(projectNode, 'Name'),
      startDate: this.formatMSPDate(this.getElementText(projectNode, 'StartDate')),
      finishDate: this.formatMSPDate(this.getElementText(projectNode, 'FinishDate')),
      dataDate: this.formatMSPDate(this.getElementText(projectNode, 'CurrentDate'))
    };
    
    return {
      activities,
      projectInfo,
      summary: `Imported MS Project schedule with ${activities.length} activities`
    };
  }
  
  private getElementText(parent: Element, tagName: string): string {
    const element = parent.getElementsByTagName(tagName)[0];
    return element?.textContent || '';
  }
  
  private extractResources(task: Element): string[] {
    const resources: string[] = [];
    const assignments = task.getElementsByTagName('Assignment');
    for (let i = 0; i < assignments.length; i++) {
      const resourceName = this.getElementText(assignments[i], 'ResourceName');
      if (resourceName) resources.push(resourceName);
    }
    return resources;
  }
  
  private mapMSPStatus(percentComplete: number): Activity['status'] {
    if (percentComplete === 100) return 'Completed';
    if (percentComplete > 0) return 'In Progress';
    return 'Not Started';
  }
  
  private formatMSPDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
  }
}

// PDF Schedule Parser using AI
export class PDFScheduleParser {
  async parse(content: string): Promise<ParsedScheduleData> {
    const prompt = `Parse this construction schedule from a PDF export. Extract all activities with the following information:
- Activity ID
- Activity Name/Description
- Duration (in days)
- Start Date
- Finish Date
- Predecessors (list of activity IDs)
- % Complete
- Total Float
- Resources
- WBS Code

The PDF content may be from MS Project, Primavera P6, or another scheduling tool.
Look for tables, activity lists, or Gantt chart data.

PDF Content:
${content}

Return as JSON:
{
  "activities": [
    {
      "activityId": "A001",
      "activityName": "Activity Name",
      "duration": 5,
      "startDate": "2024-01-15",
      "finishDate": "2024-01-19",
      "predecessors": ["A000"],
      "percentComplete": 0,
      "totalFloat": 0,
      "wbs": "1.1",
      "resources": ["Resource1"],
      "status": "Not Started"
    }
  ],
  "projectInfo": {
    "name": "Project Name",
    "startDate": "2024-01-01",
    "finishDate": "2024-12-31",
    "dataDate": "2024-01-01"
  },
  "summary": "Description of the schedule"
}`;

    try {
      const response = await poe.chat.completions.create({
        model: "gemini-2.5-pro",
        messages: [
          { 
            role: "system", 
            content: "You are a construction schedule parser. Extract structured schedule data from PDF content. Ensure dates are in YYYY-MM-DD format."
          },
          { role: "user", content: prompt }
        ]
      });
      
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      // Convert to our Activity format
      const activities: Activity[] = result.activities.map((act: any, index: number) => ({
        id: crypto.randomUUID(),
        activityId: act.activityId || `A${(index + 1).toString().padStart(3, '0')}`,
        activityName: act.activityName || 'Unnamed Activity',
        duration: act.duration || 1,
        predecessors: act.predecessors || [],
        successors: [],
        status: act.status || 'Not Started',
        percentComplete: act.percentComplete || 0,
        startDate: act.startDate || '',
        finishDate: act.finishDate || '',
        wbs: act.wbs || '',
        resources: act.resources || [],
        totalFloat: act.totalFloat || 0,
        isCritical: act.totalFloat === 0
      }));
      
      return {
        activities,
        projectInfo: result.projectInfo || {},
        summary: result.summary || `Imported PDF schedule with ${activities.length} activities`
      };
    } catch (error) {
      console.error("Error parsing PDF schedule:", error);
      throw new Error("Failed to parse PDF schedule");
    }
  }
}

// MPP Binary Parser (using AI to parse text representation)
export class MPPParser {
  async parse(content: string): Promise<ParsedScheduleData> {
    // For binary MPP files, we'll need to convert to text first
    // This would typically require a library like mpxj
    // For now, we'll use AI to parse any text representation
    
    const prompt = `Parse this MS Project schedule data. This may be a text export or representation of an MPP file.
Extract all tasks/activities with their properties.

Content:
${content}

Return as JSON with activities array containing:
- activityId (or ID)
- activityName (task name)
- duration (in days)
- startDate (YYYY-MM-DD)
- finishDate (YYYY-MM-DD)
- predecessors (array of IDs)
- percentComplete
- wbs
- resources (array)
- totalFloat (in days)
- isCritical (boolean)

Include projectInfo with name, startDate, finishDate, dataDate.`;

    try {
      const response = await poe.chat.completions.create({
        model: "gemini-2.5-pro",
        messages: [
          { 
            role: "system", 
            content: "You are an MS Project schedule parser. Extract structured data from MPP file content."
          },
          { role: "user", content: prompt }
        ]
      });
      
      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      const activities: Activity[] = result.activities.map((act: any, index: number) => ({
        id: crypto.randomUUID(),
        activityId: act.activityId || act.ID || `A${(index + 1).toString().padStart(3, '0')}`,
        activityName: act.activityName || act.name || 'Unnamed Activity',
        duration: act.duration || 1,
        predecessors: act.predecessors || [],
        successors: [],
        status: act.percentComplete === 100 ? 'Completed' : 
                act.percentComplete > 0 ? 'In Progress' : 'Not Started',
        percentComplete: act.percentComplete || 0,
        startDate: act.startDate || '',
        finishDate: act.finishDate || '',
        wbs: act.wbs || '',
        resources: act.resources || [],
        totalFloat: act.totalFloat || 0,
        isCritical: act.isCritical || act.totalFloat === 0
      }));
      
      return {
        activities,
        projectInfo: result.projectInfo || {},
        summary: `Imported MS Project schedule with ${activities.length} activities`
      };
    } catch (error) {
      console.error("Error parsing MPP file:", error);
      throw new Error("Failed to parse MPP file");
    }
  }
}

// Main parser that detects format and delegates
export async function parseScheduleFile(
  content: string, 
  filename: string
): Promise<ParsedScheduleData> {
  const extension = filename.toLowerCase().split('.').pop();
  
  try {
    switch (extension) {
      case 'xer':
        const xerParser = new XERParser();
        return xerParser.parse(content);
        
      case 'xml':
      case 'mspdi':
      case 'mpx':
        const xmlParser = new MSProjectXMLParser();
        return xmlParser.parse(content);
        
      case 'pdf':
        const pdfParser = new PDFScheduleParser();
        return await pdfParser.parse(content);
        
      case 'mpp':
        const mppParser = new MPPParser();
        return await mppParser.parse(content);
        
      default:
        // Try to detect format from content
        if (content.includes('ERMHDR') || content.includes('%T\tTASK')) {
          const xerParser = new XERParser();
          return xerParser.parse(content);
        } else if (content.includes('<?xml') && content.includes('<Project')) {
          const xmlParser = new MSProjectXMLParser();
          return xmlParser.parse(content);
        } else {
          // Use AI to parse unknown format
          const pdfParser = new PDFScheduleParser();
          return await pdfParser.parse(content);
        }
    }
  } catch (error) {
    console.error(`Error parsing ${extension} file:`, error);
    // Fallback to AI parsing
    const pdfParser = new PDFScheduleParser();
    return await pdfParser.parse(content);
  }
}