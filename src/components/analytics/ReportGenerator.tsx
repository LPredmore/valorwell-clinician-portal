import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Appointment } from "@/types/appointment";
import { ReportConfig, ReportTemplateType } from "@/types/analytics";
import * as ReportUtils from "@/utils/reportUtils";
import { useToast } from "@/hooks/use-toast";
import { DateTime } from "luxon";

interface ReportGeneratorProps {
  appointments: Appointment[];
  timezone: string;
}

/**
 * Report Generator Component
 * Allows users to generate and export reports
 */
export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  appointments,
  timezone
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("generate");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Report configuration state
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: "Appointment Utilization Report",
    description: "Overview of appointment utilization and statistics",
    templateType: ReportTemplateType.SUMMARY,
    filter: {
      startDate: DateTime.now().minus({ days: 30 }).toISO(),
      endDate: DateTime.now().toISO(),
    },
    includeCharts: true,
    includeRawData: false,
  });
  
  // Scheduled delivery state
  const [scheduledDelivery, setScheduledDelivery] = useState({
    enabled: false,
    frequency: "weekly",
    dayOfWeek: 1, // Monday
    dayOfMonth: 1,
    recipients: "",
  });
  
  // Date range state
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: DateTime.now().minus({ days: 30 }).toJSDate(),
    to: DateTime.now().toJSDate(),
  });
  
  // Format date range for display
  const formattedDateRange = `${DateTime.fromJSDate(dateRange.from).toFormat("MMM d, yyyy")} - ${DateTime.fromJSDate(dateRange.to).toFormat("MMM d, yyyy")}`;
  
  // Handle date range selection
  const handleDateRangeSelect = (range: { from?: Date; to?: Date }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
      setReportConfig({
        ...reportConfig,
        filter: {
          ...reportConfig.filter,
          startDate: DateTime.fromJSDate(range.from).toISO(),
          endDate: DateTime.fromJSDate(range.to).toISO(),
        },
      });
      setIsCalendarOpen(false);
    }
  };
  
  // Handle template type change
  const handleTemplateTypeChange = (value: string) => {
    setReportConfig({
      ...reportConfig,
      templateType: value as ReportTemplateType,
    });
  };
  
  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReportConfig({
      ...reportConfig,
      title: e.target.value,
    });
  };
  
  // Handle description change
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReportConfig({
      ...reportConfig,
      description: e.target.value,
    });
  };
  
  // Handle include charts change
  const handleIncludeChartsChange = (checked: boolean) => {
    setReportConfig({
      ...reportConfig,
      includeCharts: checked,
    });
  };
  
  // Handle include raw data change
  const handleIncludeRawDataChange = (checked: boolean) => {
    setReportConfig({
      ...reportConfig,
      includeRawData: checked,
    });
  };
  
  // Handle scheduled delivery toggle
  const handleScheduledDeliveryToggle = (checked: boolean) => {
    setScheduledDelivery({
      ...scheduledDelivery,
      enabled: checked,
    });
  };
  
  // Handle frequency change
  const handleFrequencyChange = (value: string) => {
    setScheduledDelivery({
      ...scheduledDelivery,
      frequency: value,
    });
  };
  
  // Handle day of week change
  const handleDayOfWeekChange = (value: string) => {
    setScheduledDelivery({
      ...scheduledDelivery,
      dayOfWeek: parseInt(value),
    });
  };
  
  // Handle day of month change
  const handleDayOfMonthChange = (value: string) => {
    setScheduledDelivery({
      ...scheduledDelivery,
      dayOfMonth: parseInt(value),
    });
  };
  
  // Handle recipients change
  const handleRecipientsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScheduledDelivery({
      ...scheduledDelivery,
      recipients: e.target.value,
    });
  };
  
  // Generate report
  const handleGenerateReport = async () => {
    setIsGenerating(true);
    
    try {
      // Generate report
      const report = ReportUtils.generateReport(
        reportConfig,
        appointments,
        timezone
      );
      
      // Export to PDF
      const pdfBlob = ReportUtils.exportReportToPDF(report);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportConfig.title.replace(/\s+/g, "_")}_${DateTime.now().toFormat("yyyy-MM-dd")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Report Generated",
        description: "The report has been generated and downloaded successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Report Generation Error",
        description: "Failed to generate the report",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Schedule report
  const handleScheduleReport = async () => {
    setIsScheduling(true);
    
    try {
      // Prepare recipients array
      const recipientsArray = scheduledDelivery.recipients
        .split(",")
        .map(email => email.trim())
        .filter(email => email.length > 0);
      
      // Update report config with scheduled delivery
      const configWithSchedule: ReportConfig = {
        ...reportConfig,
        scheduledDelivery: {
          frequency: scheduledDelivery.frequency as "daily" | "weekly" | "monthly",
          dayOfWeek: scheduledDelivery.frequency === "weekly" ? scheduledDelivery.dayOfWeek : undefined,
          dayOfMonth: scheduledDelivery.frequency === "monthly" ? scheduledDelivery.dayOfMonth : undefined,
          recipients: recipientsArray,
        },
      };
      
      // Schedule report
      const success = ReportUtils.scheduleReport(configWithSchedule);
      
      if (success) {
        toast({
          title: "Report Scheduled",
          description: "The report has been scheduled for automated delivery",
          variant: "default",
        });
        
        // Switch to generate tab
        setActiveTab("generate");
      } else {
        throw new Error("Failed to schedule report");
      }
    } catch (error) {
      console.error("Error scheduling report:", error);
      toast({
        title: "Scheduling Error",
        description: "Failed to schedule the report",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Generator</CardTitle>
        <CardDescription>
          Generate and schedule utilization reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 w-[400px]">
            <TabsTrigger value="generate">Generate Report</TabsTrigger>
            <TabsTrigger value="schedule">Schedule Report</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate" className="space-y-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  value={reportConfig.title}
                  onChange={handleTitleChange}
                  placeholder="Enter report title"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={reportConfig.description || ""}
                  onChange={handleDescriptionChange}
                  placeholder="Enter report description"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="template-type">Report Template</Label>
                <Select
                  value={reportConfig.templateType}
                  onValueChange={handleTemplateTypeChange}
                >
                  <SelectTrigger id="template-type">
                    <SelectValue placeholder="Select template type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ReportTemplateType.SUMMARY}>Summary Report</SelectItem>
                    <SelectItem value={ReportTemplateType.DETAILED}>Detailed Report</SelectItem>
                    <SelectItem value={ReportTemplateType.COMPARATIVE}>Comparative Report</SelectItem>
                    <SelectItem value={ReportTemplateType.UTILIZATION}>Utilization Report</SelectItem>
                    <SelectItem value={ReportTemplateType.CLIENT_ACTIVITY}>Client Activity Report</SelectItem>
                    <SelectItem value={ReportTemplateType.CLINICIAN_PERFORMANCE}>Clinician Performance Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label>Date Range</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <span className="mr-2">📅</span>
                      {formattedDateRange}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={handleDateRangeSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-charts"
                  checked={reportConfig.includeCharts}
                  onCheckedChange={handleIncludeChartsChange}
                />
                <Label htmlFor="include-charts">Include charts and visualizations</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-raw-data"
                  checked={reportConfig.includeRawData}
                  onCheckedChange={handleIncludeRawDataChange}
                />
                <Label htmlFor="include-raw-data">Include raw data tables</Label>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="schedule" className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable-scheduled-delivery"
                  checked={scheduledDelivery.enabled}
                  onCheckedChange={handleScheduledDeliveryToggle}
                />
                <Label htmlFor="enable-scheduled-delivery">Enable scheduled delivery</Label>
              </div>
              
              {scheduledDelivery.enabled && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={scheduledDelivery.frequency}
                      onValueChange={handleFrequencyChange}
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {scheduledDelivery.frequency === "weekly" && (
                    <div className="grid gap-2">
                      <Label htmlFor="day-of-week">Day of Week</Label>
                      <Select
                        value={scheduledDelivery.dayOfWeek.toString()}
                        onValueChange={handleDayOfWeekChange}
                      >
                        <SelectTrigger id="day-of-week">
                          <SelectValue placeholder="Select day of week" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                          <SelectItem value="0">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {scheduledDelivery.frequency === "monthly" && (
                    <div className="grid gap-2">
                      <Label htmlFor="day-of-month">Day of Month</Label>
                      <Select
                        value={scheduledDelivery.dayOfMonth.toString()}
                        onValueChange={handleDayOfMonthChange}
                      >
                        <SelectTrigger id="day-of-month">
                          <SelectValue placeholder="Select day of month" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  <div className="grid gap-2">
                    <Label htmlFor="recipients">Recipients (comma-separated)</Label>
                    <Input
                      id="recipients"
                      value={scheduledDelivery.recipients}
                      onChange={handleRecipientsChange}
                      placeholder="email1@example.com, email2@example.com"
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {activeTab === "generate" ? (
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        ) : (
          <Button
            onClick={handleScheduleReport}
            disabled={isScheduling || !scheduledDelivery.enabled || !scheduledDelivery.recipients}
          >
            {isScheduling ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></span>
                Scheduling...
              </>
            ) : (
              "Schedule Report"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};