
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import AppointmentDialog from '../components/calendar/AppointmentDialog';
import { useUser } from '@/context/UserContext';

const AppointmentCreate: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useUser();
  
  const selectedSlot = location.state?.start && location.state?.end ? {
    start: new Date(location.state.start),
    end: new Date(location.state.end)
  } : null;

  const handleClose = () => {
    navigate('/calendar');
  };

  const handleCreated = () => {
    navigate('/calendar');
  };

  return (
    <Layout>
      <AppointmentDialog
        isOpen={true}
        onClose={handleClose}
        selectedSlot={selectedSlot}
        clinicianId={userId}
        userTimeZone={'loading'} // TODO: Get clinician timezone from database
        onAppointmentCreated={handleCreated}
        onAppointmentUpdated={handleCreated}
        isEditMode={false}
        editingAppointment={null}
      />
    </Layout>
  );
};

export default AppointmentCreate;
