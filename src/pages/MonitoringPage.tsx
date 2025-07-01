
import React from 'react';
import { useEffect } from 'react';
import EmergencyVerification from '@/utils/emergencyVerification';

const MonitoringPage: React.FC = () => {
  // Run emergency verification on page load
  useEffect(() => {
    EmergencyVerification.logEmergencyStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold mb-6">System Monitoring</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            System monitoring dashboard. Check console for emergency verification status.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;
