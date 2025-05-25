import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ArrowRight } from 'lucide-react';

interface GoogleCalendarPlaceholderProps {
  onConnect: () => void;
}

/**
 * Placeholder component for Google Calendar integration
 * Shown when the user hasn't connected their Google Calendar yet
 */
export const GoogleCalendarPlaceholder: React.FC<GoogleCalendarPlaceholderProps> = ({ 
  onConnect 
}) => {
  return (
    <Card className="border-dashed border-2 bg-muted/50">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          Connect Google Calendar
        </CardTitle>
        <CardDescription>
          Synchronize your appointments with Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-background p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium mb-2">Two-way Sync</h3>
              <p className="text-sm text-muted-foreground">
                Keep your appointments in sync between platforms automatically
              </p>
            </div>
            <div className="bg-background p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium mb-2">Conflict Resolution</h3>
              <p className="text-sm text-muted-foreground">
                Smart handling of scheduling conflicts and changes
              </p>
            </div>
            <div className="bg-background p-4 rounded-lg shadow-sm">
              <h3 className="text-sm font-medium mb-2">Customizable</h3>
              <p className="text-sm text-muted-foreground">
                Control what gets synced and how often
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center p-6 bg-background rounded-lg shadow-sm">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 16.5V7.5C6 6.67157 6.67157 6 7.5 6H16.5C17.3284 6 18 6.67157 18 7.5V16.5C18 17.3284 17.3284 18 16.5 18H7.5C6.67157 18 6 17.3284 6 16.5Z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6 9H18" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M9 6V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M15 6V4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M9.75 12L11.25 13.5L14.25 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-4">
              Connect your Google Calendar to automatically sync appointments, 
              avoid double-booking, and keep everything up to date.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onConnect}
          className="w-full"
        >
          Connect Google Calendar
        </Button>
      </CardFooter>
    </Card>
  );
};