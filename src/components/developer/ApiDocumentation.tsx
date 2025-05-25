import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { apiEndpoints } from '@/utils/calendarApiEndpoints';
import { Code } from 'lucide-react';

/**
 * API Documentation Component
 * Provides documentation for the calendar API endpoints
 */
export const ApiDocumentation: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const baseUrl = window.location.origin;
  
  // Generate a sample API key for testing
  const generateApiKey = () => {
    const key = 'vw_' + Array.from({ length: 32 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    
    setApiKey(key);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Code className="w-5 h-5 mr-2" />
            Calendar API Documentation
          </CardTitle>
          <CardDescription>
            Integrate with the Valorwell Calendar API to build custom applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="authentication">Authentication</TabsTrigger>
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">Calendar API v1</h3>
                <p className="text-sm text-gray-500 mt-1">
                  The Valorwell Calendar API allows you to integrate with our scheduling system to manage appointments, 
                  check availability, and synchronize with external calendar services.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Base URL</h4>
                <div className="bg-gray-100 p-2 rounded-md font-mono text-sm">
                  {baseUrl}/api/calendar/v1
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Features</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Appointment management (create, read, update, delete)</li>
                  <li>Availability checking</li>
                  <li>Calendar synchronization</li>
                  <li>Batch operations</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Rate Limits</h4>
                <p className="text-sm">
                  The API is rate limited to 100 requests per minute per API key. 
                  Exceeding this limit will result in a 429 Too Many Requests response.
                </p>
              </div>
            </TabsContent>
            
            {/* Authentication Tab */}
            <TabsContent value="authentication" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">Authentication</h3>
                <p className="text-sm text-gray-500 mt-1">
                  The API uses API keys for authentication. You can generate an API key in your account settings.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">API Key</h4>
                <div className="flex space-x-2">
                  <Input 
                    value={apiKey} 
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Your API key"
                    className="font-mono"
                  />
                  <Button onClick={generateApiKey} variant="outline">Generate</Button>
                </div>
                <p className="text-xs text-gray-500">
                  This is a sample API key for testing purposes only. In production, you should use a secure API key.
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Using the API Key</h4>
                <p className="text-sm">
                  Include your API key in the <code>X-API-Key</code> header with all requests:
                </p>
                <div className="bg-gray-100 p-2 rounded-md font-mono text-sm">
                  X-API-Key: {apiKey || 'your-api-key'}
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Permissions</h4>
                <p className="text-sm">
                  API keys can have different permission levels:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><strong>Read-only:</strong> Can only read appointments and availability</li>
                  <li><strong>Read-write:</strong> Can create, read, update, and delete appointments</li>
                  <li><strong>Admin:</strong> Full access to all API endpoints</li>
                </ul>
              </div>
            </TabsContent>
            
            {/* Endpoints Tab */}
            <TabsContent value="endpoints" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">API Endpoints</h3>
                <p className="text-sm text-gray-500 mt-1">
                  The following endpoints are available for integration:
                </p>
              </div>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="appointments">
                  <AccordionTrigger>Appointments</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Get Appointments</h4>
                        <div className="bg-gray-100 p-2 rounded-md font-mono text-sm">
                          GET {baseUrl}{apiEndpoints.getAppointments}
                        </div>
                        <p className="text-sm">
                          Retrieves a list of appointments based on query parameters.
                        </p>
                        <h5 className="text-sm font-medium mt-2">Query Parameters:</h5>
                        <ul className="list-disc pl-5 space-y-1 text-xs">
                          <li><code>startDate</code> - Start date (ISO format)</li>
                          <li><code>endDate</code> - End date (ISO format)</li>
                          <li><code>status</code> - Appointment status</li>
                          <li><code>type</code> - Appointment type</li>
                          <li><code>clientId</code> - Client ID</li>
                          <li><code>clinicianId</code> - Clinician ID</li>
                          <li><code>page</code> - Page number (default: 1)</li>
                          <li><code>pageSize</code> - Page size (default: 50)</li>
                        </ul>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Get Appointment by ID</h4>
                        <div className="bg-gray-100 p-2 rounded-md font-mono text-sm">
                          GET {baseUrl}{apiEndpoints.getAppointmentById(':id')}
                        </div>
                        <p className="text-sm">
                          Retrieves a specific appointment by ID.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Create Appointment</h4>
                        <div className="bg-gray-100 p-2 rounded-md font-mono text-sm">
                          POST {baseUrl}{apiEndpoints.createAppointment}
                        </div>
                        <p className="text-sm">
                          Creates a new appointment.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Update Appointment</h4>
                        <div className="bg-gray-100 p-2 rounded-md font-mono text-sm">
                          PUT {baseUrl}{apiEndpoints.updateAppointment(':id')}
                        </div>
                        <p className="text-sm">
                          Updates an existing appointment.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Delete Appointment</h4>
                        <div className="bg-gray-100 p-2 rounded-md font-mono text-sm">
                          DELETE {baseUrl}{apiEndpoints.deleteAppointment(':id')}
                        </div>
                        <p className="text-sm">
                          Deletes an appointment.
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="availability">
                  <AccordionTrigger>Availability</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <h4 className="font-medium">Get Availability</h4>
                      <div className="bg-gray-100 p-2 rounded-md font-mono text-sm">
                        GET {baseUrl}{apiEndpoints.getAvailability}
                      </div>
                      <p className="text-sm">
                        Retrieves available time slots based on query parameters.
                      </p>
                      <h5 className="text-sm font-medium mt-2">Query Parameters:</h5>
                      <ul className="list-disc pl-5 space-y-1 text-xs">
                        <li><code>startDate</code> - Start date (ISO format)</li>
                        <li><code>endDate</code> - End date (ISO format)</li>
                        <li><code>clinicianId</code> - Clinician ID</li>
                        <li><code>duration</code> - Appointment duration in minutes (default: 60)</li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </TabsContent>
            
            {/* Examples Tab */}
            <TabsContent value="examples" className="space-y-4 mt-4">
              <div>
                <h3 className="text-lg font-medium">Code Examples</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Here are some examples of how to use the API in different programming languages:
                </p>
              </div>
              
              <Tabs defaultValue="javascript">
                <TabsList>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                </TabsList>
                
                <TabsContent value="javascript" className="mt-2">
                  <div className="bg-gray-100 p-3 rounded-md font-mono text-sm whitespace-pre overflow-x-auto">
{`// Get appointments for the next 7 days
const apiKey = '${apiKey || 'your-api-key'}';
const startDate = new Date().toISOString();
const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

fetch('${baseUrl}${apiEndpoints.getAppointments}?startDate=' + startDate + '&endDate=' + endDate, {
  headers: {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Appointments:', data);
})
.catch(error => {
  console.error('Error:', error);
});`}
                  </div>
                </TabsContent>
                
                <TabsContent value="python" className="mt-2">
                  <div className="bg-gray-100 p-3 rounded-md font-mono text-sm whitespace-pre overflow-x-auto">
{`# Get appointments for the next 7 days
import requests
from datetime import datetime, timedelta

api_key = '${apiKey || 'your-api-key'}'
start_date = datetime.now().isoformat()
end_date = (datetime.now() + timedelta(days=7)).isoformat()

url = f'${baseUrl}${apiEndpoints.getAppointments}'
headers = {
    'X-API-Key': api_key,
    'Content-Type': 'application/json'
}
params = {
    'startDate': start_date,
    'endDate': end_date
}

response = requests.get(url, headers=headers, params=params)
data = response.json()

print('Appointments:', data)`}
                  </div>
                </TabsContent>
                
                <TabsContent value="curl" className="mt-2">
                  <div className="bg-gray-100 p-3 rounded-md font-mono text-sm whitespace-pre overflow-x-auto">
{`# Get appointments for the next 7 days
curl -X GET '${baseUrl}${apiEndpoints.getAppointments}?startDate=2025-05-25T00:00:00Z&endDate=2025-06-01T00:00:00Z' \\
  -H 'X-API-Key: ${apiKey || 'your-api-key'}' \\
  -H 'Content-Type: application/json'`}
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <p className="text-xs text-gray-500">
            API Version: v1 | Last Updated: May 25, 2025
          </p>
          <Button variant="outline" onClick={() => window.open(`${baseUrl}/api/calendar/v1/docs`, '_blank')}>
            View OpenAPI Spec
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};