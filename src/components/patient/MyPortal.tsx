import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, FileText, User, Bell } from "lucide-react";
import MyAppointments from './MyAppointments';
import MyProfile from './MyProfile';
import MyDocuments from './MyDocuments';
import MyInsurance from './MyInsurance';

interface MyPortalProps {
  upcomingAppointments?: any[];
  clientData?: any;
  clinicianName?: string | null;
  loading?: boolean;
}

const MyPortal: React.FC<MyPortalProps> = ({
  upcomingAppointments = [],
  clientData = null,
  clinicianName = null,
  loading = false
}) => {
  const [activeTab, setActiveTab] = useState('appointments');

  const renderContent = () => {
    switch (activeTab) {
      case 'appointments':
        return <MyAppointments />;
      case 'profile':
        return <MyProfile 
          clientData={clientData}
          loading={loading}
          isEditing={false}
          setIsEditing={() => {}}
          form={{}}
          isSaving={false}
          handleSaveProfile={async () => {}}
          handleCancelEdit={() => {}}
          genderOptions={[]}
          genderIdentityOptions={[]}
          stateOptions={[]}
          timeZoneOptions={[]}
        />;
      case 'documents':
        return <MyDocuments />;
      case 'insurance':
        return <MyInsurance 
          clientData={clientData}
          loading={loading}
          isEditing={false}
          setIsEditing={() => {}}
          form={{}}
          isSaving={false}
          handleSaveProfile={async () => {}}
          handleCancelEdit={() => {}}
          insuranceTypes={[]}
          relationshipTypes={[]}
        />;
      default:
        return <MyAppointments />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Patient Portal</h1>
          <p className="text-gray-600">Manage your healthcare information and appointments</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card 
            className={`cursor-pointer transition-colors ${activeTab === 'appointments' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
            onClick={() => setActiveTab('appointments')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Appointments
              </CardTitle>
              <CardDescription>View and manage your appointments</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${activeTab === 'profile' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
            onClick={() => setActiveTab('profile')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${activeTab === 'documents' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
            onClick={() => setActiveTab('documents')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Access your forms and documents</CardDescription>
            </CardHeader>
          </Card>

          <Card 
            className={`cursor-pointer transition-colors ${activeTab === 'insurance' ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
            onClick={() => setActiveTab('insurance')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5" />
                Insurance
              </CardTitle>
              <CardDescription>Manage your insurance information</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div className="bg-white rounded-lg shadow">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default MyPortal;
