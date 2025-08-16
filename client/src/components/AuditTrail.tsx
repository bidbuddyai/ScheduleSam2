import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History, User, Calendar, FileText, Activity,
  GitBranch, Settings, Upload, Download, Calculator
} from "lucide-react";
import type { AuditLog } from "@shared/schema";

interface AuditTrailProps {
  projectId: string;
  entityId?: string;
  entityType?: string;
}

export default function AuditTrail({ projectId, entityId, entityType }: AuditTrailProps) {
  // Fetch audit logs
  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/projects', projectId, 'audit-logs', entityId, entityType],
    queryFn: async () => {
      let url = `/api/projects/${projectId}/audit-logs`;
      const params = new URLSearchParams();
      if (entityId) params.append('entityId', entityId);
      if (entityType) params.append('entityType', entityType);
      if (params.toString()) url += `?${params.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      return response.json();
    }
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Create': return <Activity className="w-4 h-4 text-green-600" />;
      case 'Update': return <Settings className="w-4 h-4 text-blue-600" />;
      case 'Delete': return <Activity className="w-4 h-4 text-red-600" />;
      case 'Import': return <Upload className="w-4 h-4 text-purple-600" />;
      case 'Export': return <Download className="w-4 h-4 text-indigo-600" />;
      case 'Calculate': return <Calculator className="w-4 h-4 text-orange-600" />;
      case 'BaselineSet': return <GitBranch className="w-4 h-4 text-teal-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Create': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Update': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Delete': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Import': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'Export': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'Calculate': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'BaselineSet': return 'bg-teal-100 text-teal-800 dark:bg-teal-900/20 dark:text-teal-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatChanges = (changes: any) => {
    if (!changes) return null;
    
    const changedFields = Object.keys(changes.new || {});
    if (changedFields.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Changes:</p>
        <div className="text-xs space-y-1">
          {changedFields.slice(0, 3).map(field => (
            <div key={field} className="flex items-center space-x-2">
              <span className="text-gray-500">{field}:</span>
              {changes.old && changes.old[field] && (
                <>
                  <span className="line-through text-gray-400">{changes.old[field]}</span>
                  <span>→</span>
                </>
              )}
              <span className="font-medium">{changes.new[field]}</span>
            </div>
          ))}
          {changedFields.length > 3 && (
            <span className="text-gray-500">...and {changedFields.length - 3} more fields</span>
          )}
        </div>
      </div>
    );
  };

  // Group logs by date
  const groupedLogs = auditLogs.reduce((acc, log) => {
    const date = new Date(log.performedAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);

  // Filter logs by action type
  const getFilteredLogs = (filter: string) => {
    if (filter === 'all') return auditLogs;
    return auditLogs.filter(log => {
      if (filter === 'changes') return ['Create', 'Update', 'Delete'].includes(log.action);
      if (filter === 'imports') return ['Import', 'Export'].includes(log.action);
      if (filter === 'calculations') return ['Calculate', 'BaselineSet'].includes(log.action);
      return true;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Audit Trail</h3>
          <Badge variant="outline">{auditLogs.length} Events</Badge>
        </div>
      </div>

      {/* Filters */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All Events</TabsTrigger>
          <TabsTrigger value="changes">Changes</TabsTrigger>
          <TabsTrigger value="imports">Import/Export</TabsTrigger>
          <TabsTrigger value="calculations">Calculations</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <AuditLogsList logs={auditLogs} groupedLogs={groupedLogs} />
        </TabsContent>
        <TabsContent value="changes" className="space-y-4">
          <AuditLogsList logs={getFilteredLogs('changes')} groupedLogs={groupedLogs} />
        </TabsContent>
        <TabsContent value="imports" className="space-y-4">
          <AuditLogsList logs={getFilteredLogs('imports')} groupedLogs={groupedLogs} />
        </TabsContent>
        <TabsContent value="calculations" className="space-y-4">
          <AuditLogsList logs={getFilteredLogs('calculations')} groupedLogs={groupedLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );

  function AuditLogsList({ logs, groupedLogs }: { logs: AuditLog[]; groupedLogs: Record<string, AuditLog[]> }) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="text-gray-500">Loading audit logs...</div>
        </div>
      );
    }

    if (logs.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <History className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No audit events found</p>
            <p className="text-sm text-gray-400">Changes will be tracked here</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <ScrollArea className="h-[500px]">
        <div className="space-y-4">
          {Object.entries(groupedLogs).map(([date, dateLogs]) => (
            <div key={date} className="space-y-2">
              <div className="flex items-center space-x-2 sticky top-0 bg-white dark:bg-gray-950 py-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{date}</span>
                <Separator className="flex-1" />
              </div>
              
              {dateLogs.map((log) => (
                <Card key={log.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">{getActionIcon(log.action)}</div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="secondary" className={`text-xs ${getActionColor(log.action)}`}>
                              {log.action}
                            </Badge>
                            <span className="text-sm font-medium">{log.entityType}</span>
                            <span className="text-xs text-gray-500">#{log.entityId.slice(0, 8)}</span>
                          </div>
                          
                          {log.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{log.notes}</p>
                          )}
                          
                          {formatChanges(log.changes)}
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{log.performedBy}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(log.performedAt).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }
}