
import React from 'react';
import { Input } from "@/components/ui/input";
import { DiagnosisSelector } from "@/components/DiagnosisSelector";

interface ClientInfoSectionProps {
  formState: any;
  handleChange: (field: string, value: string | string[]) => void;
}

export const ClientInfoSection: React.FC<ClientInfoSectionProps> = ({
  formState,
  handleChange
}) => {
  // Convert string diagnosis to array if needed for DiagnosisSelector
  const diagnosisArray = formState.diagnosis ? 
    (typeof formState.diagnosis === 'string' ? 
      formState.diagnosis.split(',').map(d => d.trim()).filter(Boolean) : 
      formState.diagnosis) : 
    [];
  
  const isDiagnosisEmpty = !diagnosisArray.length;

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
          <Input
            placeholder="Enter patient name"
            value={formState.patientName}
            onChange={(e) => handleChange('patientName', e.target.value)}
            readOnly
            className="bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient DOB</label>
          <Input
            placeholder="MM/DD/YYYY"
            value={formState.patientDOB}
            onChange={(e) => handleChange('patientDOB', e.target.value)}
            readOnly
            className="bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Clinician Name</label>
          <Input
            placeholder="Enter clinician name"
            value={formState.clinicianName}
            onChange={(e) => handleChange('clinicianName', e.target.value)}
            readOnly
            className="bg-gray-100"
          />
        </div>
      </div>

      <div className={`grid grid-cols-1 ${formState.planType || formState.treatmentFrequency ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-6 mb-6`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
          {isDiagnosisEmpty ? (
            <DiagnosisSelector 
              value={diagnosisArray}
              onChange={(value) => handleChange('diagnosis', value)}
            />
          ) : (
            <Input
              placeholder="Select diagnosis code"
              value={formState.diagnosis}
              readOnly
              className="bg-gray-100"
            />
          )}
        </div>
        {formState.planType && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
            <Input
              placeholder="Select plan length"
              value={formState.planType}
              onChange={(e) => handleChange('planType', e.target.value)}
              readOnly
              className="bg-gray-100"
            />
          </div>
        )}
        {formState.treatmentFrequency && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Treatment Frequency</label>
            <Input
              placeholder="Select frequency"
              value={formState.treatmentFrequency}
              onChange={(e) => handleChange('treatmentFrequency', e.target.value)}
              readOnly
              className="bg-gray-100"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Date</label>
          <Input
            type="date"
            value={formState.sessionDate}
            onChange={(e) => handleChange('sessionDate', e.target.value)}
            placeholder="Select date"
            readOnly
            className="bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Medications</label>
          <Input
            placeholder="List current medications"
            value={formState.medications}
            onChange={(e) => handleChange('medications', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Session Type</label>
          <Input
            placeholder="Enter session type"
            value={formState.sessionType}
            onChange={(e) => handleChange('sessionType', e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Person's in Attendance</label>
        <Input
          placeholder="List all attendees"
          value={formState.personsInAttendance}
          onChange={(e) => handleChange('personsInAttendance', e.target.value)}
        />
      </div>
    </>
  );
};
