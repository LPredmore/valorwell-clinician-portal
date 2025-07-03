
import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Settings, Link2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNylasIntegration } from '@/hooks/useNylasIntegration';
import { Badge } from '@/components/ui/badge';

const CalendarConnectionsButton: React.FC = () => {
  const navigate = useNavigate();
  const { connections, isLoading } = useNylasIntegration();

  const handleClick = () => {
    navigate('/settings', { state: { activeTab: 'calendar' } });
  };

  const getConnectionStatus = () => {
    if (isLoading) return { text: 'Loading...', variant: 'secondary' as const };
    if (connections.length === 0) return { text: 'Not Connected', variant: 'destructive' as const };
    return { text: `${connections.length} Connected`, variant: 'secondary' as const };
  };

  const status = getConnectionStatus();

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className="flex items-center gap-2"
      >
        <Link2 className="h-4 w-4" />
        Calendar Sync
      </Button>
      <Badge variant={status.variant} className="text-xs">
        {status.text}
      </Badge>
    </div>
  );
};

export default CalendarConnectionsButton;
