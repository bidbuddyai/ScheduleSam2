import type { Activity } from "../client/src/components/ScheduleEditor";
import type { ProjectSchedule, ScheduleActivity } from "@shared/schema";

interface ExportData {
  schedule: ProjectSchedule;
  activities: ScheduleActivity[];
  projectName?: string;
}

// XER Exporter for Primavera P6
export class XERExporter {
  private tables: Map<string, any[]> = new Map();
  private currentDate = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  
  export(data: ExportData): string {
    const { schedule, activities, projectName } = data;
    let output = '';
    
    // XER Header
    output += 'ERMHDR\t1.0\tProject\t' + this.currentDate + '\tPrimavera\tP6\n';
    output += '%T\tCURRENCY\n';
    output += '%F\tcurr_id\tcurr_symbol\tcurr_type\n';
    output += '%R\t1\t$\tUS Dollar\n';
    
    // Project table
    output += '%T\tPROJECT\n';
    output += '%F\tproj_id\tproj_short_name\tplan_start_date\tplan_end_date\tlast_recalc_date\n';
    output += '%R\t1\t' + (projectName || 'Project') + '\t' + schedule.startDate + '\t' + schedule.finishDate + '\t' + schedule.dataDate + '\n';
    
    // Calendar table
    output += '%T\tCALENDAR\n';
    output += '%F\tcalendar_id\tcalendar_name\tdefault_flag\n';
    output += '%R\t1\tStandard\tY\n';
    
    // Task table
    output += '%T\tTASK\n';
    output += '%F\ttask_id\ttask_code\ttask_name\ttask_type\tstatus_code\ttarget_start_date\ttarget_end_date\ttarget_drtn_hr_cnt\tremain_drtn_hr_cnt\tphys_complete_pct\ttotal_float_hr_cnt\tfree_float_hr_cnt\twbs_id\n';
    
    activities.forEach((act, index) => {
      const statusCode = this.mapStatusToP6(act.status || 'Not Started');
      const duration = (act.originalDuration || 0) * 8; // Convert days to hours
      const remainingDuration = (act.remainingDuration || 0) * 8;
      const percentComplete = act.status === 'Completed' ? 100 : 
                             act.status === 'In Progress' ? 50 : 0;
      const totalFloat = (act.totalFloat || 0) * 8;
      
      output += '%R\t' + (index + 1) + '\t' + act.activityId + '\t' + act.activityName + '\tTask Activity\t' + 
                statusCode + '\t' + act.startDate + '\t' + act.finishDate + '\t' + 
                duration + '\t' + remainingDuration + '\t' + percentComplete + '\t' + 
                totalFloat + '\t0\t' + (act.notes || '') + '\n';
    });
    
    // Task predecessors table
    output += '%T\tTASKPRED\n';
    output += '%F\ttaskpred_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt\n';
    
    let predId = 1;
    activities.forEach((act, index) => {
      if (act.predecessors) {
        const predList = act.predecessors.split(',').filter(p => p);
        predList.forEach(pred => {
          const predIndex = activities.findIndex(a => a.activityId === pred.trim());
          if (predIndex >= 0) {
            output += '%R\t' + predId + '\t' + (index + 1) + '\t' + (predIndex + 1) + '\tFS\t0\n';
            predId++;
          }
        });
      }
    });
    
    output += '%E\n'; // End of file marker
    return output;
  }
  
  private mapStatusToP6(status: string): string {
    switch (status) {
      case 'Completed': return 'TK_Complete';
      case 'In Progress': return 'TK_Active';
      default: return 'TK_NotStart';
    }
  }
}

// MS Project XML Exporter (MSPDI format)
export class MSProjectXMLExporter {
  export(data: ExportData): string {
    const { schedule, activities, projectName } = data;
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<Project xmlns="http://schemas.microsoft.com/project">\n';
    
    // Project properties
    xml += '  <Name>' + (projectName || 'Project') + '</Name>\n';
    xml += '  <Title>' + (projectName || 'Project') + '</Title>\n';
    xml += '  <StartDate>' + schedule.startDate + 'T00:00:00</StartDate>\n';
    xml += '  <FinishDate>' + schedule.finishDate + 'T00:00:00</FinishDate>\n';
    xml += '  <CurrentDate>' + schedule.dataDate + 'T00:00:00</CurrentDate>\n';
    
    // Calendar
    xml += '  <Calendars>\n';
    xml += '    <Calendar>\n';
    xml += '      <UID>1</UID>\n';
    xml += '      <Name>Standard</Name>\n';
    xml += '      <IsBaseCalendar>1</IsBaseCalendar>\n';
    xml += '    </Calendar>\n';
    xml += '  </Calendars>\n';
    
    // Tasks
    xml += '  <Tasks>\n';
    
    // Add root task
    xml += '    <Task>\n';
    xml += '      <UID>0</UID>\n';
    xml += '      <ID>0</ID>\n';
    xml += '      <Name>' + (projectName || 'Project') + '</Name>\n';
    xml += '      <Type>1</Type>\n';
    xml += '      <OutlineLevel>0</OutlineLevel>\n';
    xml += '      <Summary>1</Summary>\n';
    xml += '    </Task>\n';
    
    // Add activities
    activities.forEach((act, index) => {
      const uid = index + 1;
      xml += '    <Task>\n';
      xml += '      <UID>' + uid + '</UID>\n';
      xml += '      <ID>' + uid + '</ID>\n';
      xml += '      <Name>' + this.escapeXml(act.activityName) + '</Name>\n';
      xml += '      <Type>0</Type>\n';
      xml += '      <Duration>PT' + ((act.originalDuration || 0) * 8) + 'H0M0S</Duration>\n';
      xml += '      <DurationFormat>7</DurationFormat>\n';
      xml += '      <Start>' + act.startDate + 'T08:00:00</Start>\n';
      xml += '      <Finish>' + act.finishDate + 'T17:00:00</Finish>\n';
      xml += '      <PercentComplete>' + this.getPercentComplete(act.status || 'Not Started') + '</PercentComplete>\n';
      xml += '      <OutlineLevel>1</OutlineLevel>\n';
      xml += '      <Critical>' + ((act.totalFloat || 0) === 0 ? '1' : '0') + '</Critical>\n';
      xml += '      <TotalSlack>' + ((act.totalFloat || 0) * 480) + '</TotalSlack>\n'; // Convert days to minutes
      
      if (act.notes) {
        xml += '      <Notes>' + this.escapeXml(act.notes) + '</Notes>\n';
      }
      
      xml += '      <WBS>' + (act.notes || uid.toString()) + '</WBS>\n';
      
      // Add predecessor links
      if (act.predecessors) {
        const predList = act.predecessors.split(',').filter(p => p);
        predList.forEach(pred => {
          const predIndex = activities.findIndex(a => a.activityId === pred.trim());
          if (predIndex >= 0) {
            xml += '      <PredecessorLink>\n';
            xml += '        <PredecessorUID>' + (predIndex + 1) + '</PredecessorUID>\n';
            xml += '        <Type>1</Type>\n'; // Finish-to-Start
            xml += '      </PredecessorLink>\n';
          }
        });
      }
      
      xml += '    </Task>\n';
    });
    
    xml += '  </Tasks>\n';
    xml += '</Project>\n';
    
    return xml;
  }
  
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  
  private getPercentComplete(status: string): number {
    switch (status) {
      case 'Completed': return 100;
      case 'In Progress': return 50;
      default: return 0;
    }
  }
}

// PDF Schedule Report Generator
export class PDFScheduleExporter {
  export(data: ExportData): string {
    const { schedule, activities, projectName } = data;
    
    // Generate HTML that can be converted to PDF
    let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${projectName || 'Project'} Schedule Report</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      margin: 20px;
      font-size: 12px;
    }
    h1 { 
      color: #03512A; 
      border-bottom: 2px solid #1C7850;
      padding-bottom: 10px;
    }
    h2 { 
      color: #1C7850; 
      margin-top: 30px;
    }
    .header-info {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .info-row {
      display: flex;
      margin: 5px 0;
    }
    .info-label {
      font-weight: bold;
      width: 150px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 20px;
      font-size: 11px;
    }
    th { 
      background: #03512A; 
      color: white; 
      padding: 8px;
      text-align: left;
      font-weight: normal;
    }
    td { 
      border: 1px solid #ddd; 
      padding: 6px;
    }
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    .critical {
      background: #ffe4e4 !important;
    }
    .completed {
      background: #e4ffe4 !important;
    }
    .in-progress {
      background: #fff9e4 !important;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      text-align: center;
      color: #666;
      font-size: 10px;
    }
  </style>
</head>
<body>
  <h1>${projectName || 'Project'} - CPM Schedule Report</h1>
  
  <div class="header-info">
    <div class="info-row">
      <span class="info-label">Schedule Type:</span>
      <span>${schedule.scheduleType}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Data Date:</span>
      <span>${schedule.dataDate}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Start Date:</span>
      <span>${schedule.startDate}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Finish Date:</span>
      <span>${schedule.finishDate}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Total Activities:</span>
      <span>${activities.length}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Critical Activities:</span>
      <span>${activities.filter(a => a.totalFloat === 0).length}</span>
    </div>
  </div>
  
  <h2>Activity Schedule</h2>
  <table>
    <thead>
      <tr>
        <th>Activity ID</th>
        <th>Activity Name</th>
        <th>Duration</th>
        <th>Start Date</th>
        <th>Finish Date</th>
        <th>Total Float</th>
        <th>Status</th>
        <th>Predecessors</th>
        <th>WBS</th>
      </tr>
    </thead>
    <tbody>`;
    
    activities.forEach(act => {
      const rowClass = act.status === 'Completed' ? 'completed' : 
                      act.status === 'In Progress' ? 'in-progress' :
                      act.totalFloat === 0 ? 'critical' : '';
      
      html += `
      <tr class="${rowClass}">
        <td>${act.activityId}</td>
        <td>${act.activityName}</td>
        <td>${act.originalDuration}d</td>
        <td>${act.startDate}</td>
        <td>${act.finishDate}</td>
        <td>${act.totalFloat || 0}d</td>
        <td>${act.status}</td>
        <td>${act.predecessors || '-'}</td>
        <td>${act.notes || '-'}</td>
      </tr>`;
    });
    
    html += `
    </tbody>
  </table>
  
  <h2>Schedule Summary</h2>
  <div class="header-info">
    <div class="info-row">
      <span class="info-label">Completed Activities:</span>
      <span>${activities.filter(a => a.status === 'Completed').length} (${Math.round(activities.filter(a => a.status === 'Completed').length / activities.length * 100)}%)</span>
    </div>
    <div class="info-row">
      <span class="info-label">In Progress:</span>
      <span>${activities.filter(a => a.status === 'In Progress').length}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Not Started:</span>
      <span>${activities.filter(a => a.status === 'Not Started').length}</span>
    </div>
  </div>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>Adams & Grand Demolition - Construction Schedule Management System</p>
  </div>
</body>
</html>`;
    
    return html;
  }
}

// Main export function
export async function exportSchedule(
  format: 'xer' | 'xml' | 'pdf',
  schedule: ProjectSchedule,
  activities: ScheduleActivity[],
  projectName?: string
): Promise<{ content: string; mimeType: string; filename: string }> {
  const exportData: ExportData = { schedule, activities, projectName };
  
  switch (format) {
    case 'xer': {
      const exporter = new XERExporter();
      return {
        content: exporter.export(exportData),
        mimeType: 'text/plain',
        filename: `schedule_${schedule.id}.xer`
      };
    }
    
    case 'xml': {
      const exporter = new MSProjectXMLExporter();
      return {
        content: exporter.export(exportData),
        mimeType: 'application/xml',
        filename: `schedule_${schedule.id}.xml`
      };
    }
    
    case 'pdf': {
      const exporter = new PDFScheduleExporter();
      return {
        content: exporter.export(exportData),
        mimeType: 'text/html', // Will be converted to PDF on client
        filename: `schedule_${schedule.id}.pdf`
      };
    }
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}