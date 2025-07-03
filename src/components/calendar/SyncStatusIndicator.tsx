
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';

interface SyncStatusIndicatorProps {
  isSynced: boolean;
  syncDirection?: 'inbound' | 'outbound' | 'bidirectional';
  externalEventId?: string;
  lastSynced?: string;
  isLoading?: boolean;
  error?: string | null;
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  isSynced,
  syncDirection,
  externalEventId,
  lastSynced,
  isLoading = false,
  error
}) => {
  if (isLoading) {
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Syncing...
      </Badge>
    );
  }

  if (error) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1" title={error}>
        <AlertCircle className="h-3 w-3" />
        Sync Failed
      </Badge>
    );
  }

  if (isSynced) {
    const directionText = syncDirection === 'bidirectional' ? 'Synced' : 
                         syncDirection === 'inbound' ? 'From Calendar' : 
                         'To Calendar';
    
    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-600 hover:bg-green-700">
        <CheckCircle className="h-3 w-3" />
        {directionText}
        {externalEventId && <ExternalLink className="h-3 w-3" />}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      Not Synced
    </Badge>
  );
};
