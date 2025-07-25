
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import BlockTimeDialog from '../components/calendar/BlockTimeDialog';
import { useUser } from '@/context/UserContext';

const BlockedTimeCreate: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useUser();

  const handleClose = () => {
    navigate('/calendar');
  };

  const handleCreated = () => {
    navigate('/calendar');
  };

  return (
    <Layout>
      <BlockTimeDialog
        isOpen={true}
        onClose={handleClose}
        clinicianId={userId || ''}
        onBlockedTimeCreated={handleCreated}
      />
    </Layout>
  );
};

export default BlockedTimeCreate;
