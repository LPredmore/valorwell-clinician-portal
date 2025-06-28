
import React from 'react';
import { useEffect } from 'react';
import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';
import EmergencyVerification from '@/utils/emergencyVerification';

const MonitoringPage: React.FC = () => {
  // Run emergency verification on page load
  useEffect(() => {
    EmergencyVerification.logEmergencyStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <MonitoringDashboard />
    </div>
  );
};

export default MonitoringPage;
