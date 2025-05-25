import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Loader2, FileUp, FileDown, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Appointment } from '@/types/appointment';
import { CalendarFormat, ImportExportOptions, ImportResult, ExportResult } from '@/types/calendarSync';
import { exportCalendarData, importCalendarData } from '@/utils/calendarImportExport';
import { DateTime } from 'luxon';

interface ImportExportManagerProps {
  appointments: Appointment[];
  onImportComplete: (importedAppointments: any[]) => void;
}

/**
 * Import/Export Manager Component
 * Provides UI for importing and exporting calendar data
 */
export const ImportExportManager: React.FC<ImportExportManagerProps> = ({
  appointments,
  onImportComplete
}) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  
  // Export state
  const [exportFormat, setExportFormat] = useState<CalendarFormat>(CalendarFormat.ICAL);
  const [exportDateRange, setExportDateRange] = useState({
    startDate: DateTime.now().minus({ days: 30 }).toFormat('yyyy-MM-dd'),
    endDate: DateTime.now().plus({ days: 90 }).toFormat('yyyy-MM-dd')
  });
  const [includeClientInfo, setIncludeClientInfo] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  
  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<CalendarFormat>(CalendarFormat.ICAL);
  const [importDateRange, setImportDateRange] = useState({
    startDate: DateTime.now().minus({ days: 30 }).toFormat('yyyy-MM-dd'),
    endDate: DateTime.now().plus({ days: 90 }).toFormat('yyyy-MM-dd')
  });
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  
  const { toast } = useToast();
  
  // Handle export
  const handleExport = async () => {
    try {
      setExportLoading(true);
      setExportResult(null);
      
      // Prepare export options
      const options: ImportExportOptions = {
        format: exportFormat,
        dateRange: {
          startDate: exportDateRange.startDate,
          endDate: exportDateRange.endDate
        },
        includeClientInfo,
        includeNotes,
        includeCancelled
      };
      
      // Export data
      const result = await exportCalendarData(appointments, options);
      setExportResult(result);
      
      toast({
        title: 'Export Complete',
        description: `Successfully exported ${result.eventCount} appointments to ${result.fileName}`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: error.message || 'Failed to export calendar data',
        variant: 'destructive'
      });
    } finally {
      setExportLoading(false);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImportFile(file);
      
      // Auto-detect format from file extension
      const extension = file.name.split('.').pop().toLowerCase();
      
      if (extension === 'ics') {
        setImportFormat(CalendarFormat.ICAL);
      } else if (extension === 'csv') {
        setImportFormat(CalendarFormat.CSV);
      } else if (extension === 'json') {
        setImportFormat(CalendarFormat.JSON);
      }
    }
  };
  
  // Handle import
  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: 'No File Selected',
        description: 'Please select a file to import',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      setImportLoading(true);
      setImportProgress(0);
      setImportResult(null);
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setImportProgress(prev => {
          const newProgress = prev + 10;
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 300);
      
      // Prepare import options
      const options: ImportExportOptions = {
        format: importFormat,
        dateRange: {
          startDate: importDateRange.startDate,
          endDate: importDateRange.endDate
        }
      };
      
      // Import data
      const result = await importCalendarData(importFile, options);
      setImportResult(result);
      
      // Complete progress
      clearInterval(progressInterval);
      setImportProgress(100);
      
      // Notify parent component
      if (result.importedEvents > 0) {
        // Pass the imported events array instead of just the count
        onImportComplete(result.importedData || []);
      }
      
      toast({
        title: 'Import Complete',
        description: `Successfully imported ${result.importedEvents} appointments`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import Failed',
        description: error.message || 'Failed to import calendar data',
        variant: 'destructive'
      });
    } finally {
      setImportLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Calendar Import/Export
        </CardTitle>
        <CardDescription>
          Import and export calendar data in various formats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'export' | 'import')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export" className="flex items-center">
              <FileDown className="w-4 h-4 mr-2" />
              Export
            </TabsTrigger>
            <TabsTrigger value="import" className="flex items-center">
              <FileUp className="w-4 h-4 mr-2" />
              Import
            </TabsTrigger>
          </TabsList>
          
          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="export-format">Export Format</Label>
                <Select
                  value={exportFormat}
                  onValueChange={(value) => setExportFormat(value as CalendarFormat)}
                >
                  <SelectTrigger id="export-format">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CalendarFormat.ICAL}>iCalendar (.ics)</SelectItem>
                    <SelectItem value={CalendarFormat.CSV}>CSV (.csv)</SelectItem>
                    <SelectItem value={CalendarFormat.JSON}>JSON (.json)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="export-start-date" className="text-xs">Start Date</Label>
                    <Input
                      id="export-start-date"
                      type="date"
                      value={exportDateRange.startDate}
                      onChange={(e) => setExportDateRange({ ...exportDateRange, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="export-end-date" className="text-xs">End Date</Label>
                    <Input
                      id="export-end-date"
                      type="date"
                      value={exportDateRange.endDate}
                      onChange={(e) => setExportDateRange({ ...exportDateRange, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Export Options</Label>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-client-info"
                    checked={includeClientInfo}
                    onCheckedChange={(checked) => setIncludeClientInfo(checked === true)}
                  />
                  <Label htmlFor="include-client-info" className="text-sm">Include client information</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-notes"
                    checked={includeNotes}
                    onCheckedChange={(checked) => setIncludeNotes(checked === true)}
                  />
                  <Label htmlFor="include-notes" className="text-sm">Include appointment notes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-cancelled"
                    checked={includeCancelled}
                    onCheckedChange={(checked) => setIncludeCancelled(checked === true)}
                  />
                  <Label htmlFor="include-cancelled" className="text-sm">Include cancelled appointments</Label>
                </div>
              </div>
            </div>
            
            {exportResult && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Export Successful</AlertTitle>
                <AlertDescription className="text-green-700">
                  Successfully exported {exportResult.eventCount} appointments to {exportResult.fileName} ({Math.round(exportResult.fileSize / 1024)} KB)
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              onClick={handleExport}
              disabled={exportLoading}
              className="w-full"
            >
              {exportLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4 mr-2" />
                  Export {appointments.length} Appointments
                </>
              )}
            </Button>
          </TabsContent>
          
          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="import-file">Select File</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".ics,.csv,.json"
                  onChange={handleFileSelect}
                  disabled={importLoading}
                />
                {importFile && (
                  <p className="text-xs text-gray-500">
                    Selected: {importFile.name} ({Math.round(importFile.size / 1024)} KB)
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="import-format">Import Format</Label>
                  <Select
                    value={importFormat}
                    onValueChange={(value) => setImportFormat(value as CalendarFormat)}
                  >
                    <SelectTrigger id="import-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CalendarFormat.ICAL}>iCalendar (.ics)</SelectItem>
                      <SelectItem value={CalendarFormat.CSV}>CSV (.csv)</SelectItem>
                      <SelectItem value={CalendarFormat.JSON}>JSON (.json)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date Range Filter (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="import-start-date" className="text-xs">Start Date</Label>
                      <Input
                        id="import-start-date"
                        type="date"
                        value={importDateRange.startDate}
                        onChange={(e) => setImportDateRange({ ...importDateRange, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="import-end-date" className="text-xs">End Date</Label>
                      <Input
                        id="import-end-date"
                        type="date"
                        value={importDateRange.endDate}
                        onChange={(e) => setImportDateRange({ ...importDateRange, endDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {importLoading && (
              <div className="space-y-2">
                <Label>Import Progress</Label>
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-center text-gray-500">
                  {importProgress < 100 ? 'Processing...' : 'Complete!'}
                </p>
              </div>
            )}
            
            {importResult && (
              <Alert className={importResult.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}>
                <CheckCircle2 className={`h-4 w-4 ${importResult.errors.length > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                <AlertTitle className={importResult.errors.length > 0 ? 'text-yellow-800' : 'text-green-800'}>
                  Import {importResult.errors.length > 0 ? 'Completed with Warnings' : 'Successful'}
                </AlertTitle>
                <AlertDescription className={importResult.errors.length > 0 ? 'text-yellow-700' : 'text-green-700'}>
                  <p>
                    Processed {importResult.totalEvents} events:
                    <br />
                    • {importResult.importedEvents} imported successfully
                    <br />
                    • {importResult.skippedEvents} skipped
                    <br />
                    • {importResult.errors.length} errors
                  </p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 text-xs">
                      <p className="font-medium">Errors:</p>
                      <ul className="list-disc pl-4">
                        {importResult.errors.slice(0, 3).map((error, index) => (
                          <li key={index}>{error.error}</li>
                        ))}
                        {importResult.errors.length > 3 && (
                          <li>...and {importResult.errors.length - 3} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              onClick={handleImport}
              disabled={importLoading || !importFile}
              className="w-full"
            >
              {importLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 mr-2" />
                  Import Calendar Data
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-gray-500">
          {activeTab === 'export' ? 
            `${appointments.length} appointments available for export` : 
            'Supported formats: iCalendar (.ics), CSV (.csv), JSON (.json)'
          }
        </p>
      </CardFooter>
    </Card>
  );
};