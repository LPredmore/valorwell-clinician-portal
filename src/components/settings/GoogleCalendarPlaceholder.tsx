import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

/**
 * Placeholder component that replaces the Google Calendar integration components.
 * This component is used after the Google Calendar integration was removed.
 */
export function GoogleCalendarPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendar Integration
        </CardTitle>
        <CardDescription>
          Calendar integration functionality is not available
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500 mb-4">
          Calendar integration functionality has been removed from this application.
          Please contact your administrator for more information.
        </p>
      </CardContent>
    </Card>
  );
}

export default GoogleCalendarPlaceholder;