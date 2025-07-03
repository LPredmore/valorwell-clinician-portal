
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { AppointmentDialog } from '../components/AppointmentDialog';
import { useUser } from '@/context/UserContext';
import { getClinicianTimeZone } from '@/hooks/useClinicianData';
import { useState, useEffect } from 'react';

const AppointmentCreate: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId } = useUser();
  const [clinicianTimeZone, setClinicianTimeZone] = useState<string>('America/New_York');
  
  const selectedSlot = location.state?.start && location.state?.end ? {
    start: new Date(location.state.start),
    end: new Date(location.state.end)
  } : null;

  // Fetch clinician timezone
  useEffect(() => {
    if (userId) {
      getClinicianTimeZone(userId).then(timeZone => {
        const safeTimeZone = Array.isArray(timeZone) ? timeZone[0] : timeZone;
        setClinicianTimeZone(safeTimeZone || 'America/New_York');
      }).catch(() => {
        setClinicianTimeZone('America/New_York');
      });
    }
  }, [userId]);

  const handleClose = () => {
    navigate('/calendar');
  };

  const handleCreated = () => {
    navigate('/calendar');
  };

  if (!userId) {
    return <Layout><div>Loading...</div></Layout>;
  }

  return (
    <Layout>
      <AppointmentDialog
        isOpen={true}
        onClose={handleClose}
        clinicianId={userId}
        clinicianTimeZone={clinicianTimeZone}
        onAppointmentCreated={handleCreated}
        initialData={selectedSlot}
      />
    </Layout>
  );
};

export default AppointmentCreate;
