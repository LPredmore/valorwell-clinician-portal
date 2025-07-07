import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Video, RefreshCw, Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { videoRoomMigration, MigrationProgress } from '@/utils/videoRoomMigration';
import { videoRoomService } from '@/utils/videoRoomService';
import { useToast } from '@/hooks/use-toast';

const VideoRoomManagement: React.FC = () => {
  const [migrationStats, setMigrationStats] = useState<{
    total: number;
    needingRooms: number;
    isLoading: boolean;
  }>({
    total: 0,
    needingRooms: 0,
    isLoading: true
  });

  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [isRunningMigration, setIsRunningMigration] = useState(false);
  const [queueStatus, setQueueStatus] = useState({ pending: 0, isProcessing: false });
  const { toast } = useToast();

  useEffect(() => {
    loadMigrationStats();
    
    // Poll queue status every 5 seconds
    const interval = setInterval(() => {
      setQueueStatus(videoRoomService.getQueueStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadMigrationStats = async () => {
    try {
      setMigrationStats(prev => ({ ...prev, isLoading: true }));
      
      const { total, appointments } = await videoRoomMigration.getAppointmentsNeedingVideoRooms();
      
      setMigrationStats({
        total: total,
        needingRooms: appointments.length,
        isLoading: false
      });
    } catch (error) {
      console.error('[VideoRoomManagement] Error loading stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load video room statistics',
        variant: 'destructive'
      });
      setMigrationStats(prev => ({ ...prev, isLoading: false }));
    }
  };

  const runFullMigration = async () => {
    try {
      setIsRunningMigration(true);
      setMigrationProgress(null);

      const result = await videoRoomMigration.runMigration((progress) => {
        setMigrationProgress(progress);
      });

      toast({
        title: 'Migration Complete',
        description: `Created ${result.successfulCreations} video rooms. ${result.failedCreations} failed.`,
        variant: result.failedCreations > 0 ? 'destructive' : 'default'
      });

      // Refresh stats
      await loadMigrationStats();

    } catch (error) {
      console.error('[VideoRoomManagement] Migration failed:', error);
      toast({
        title: 'Migration Failed',
        description: 'An error occurred during the migration process',
        variant: 'destructive'
      });
    } finally {
      setIsRunningMigration(false);
      setMigrationProgress(null);
    }
  };

  const getMigrationProgressPercentage = (): number => {
    if (!migrationProgress || migrationProgress.total === 0) return 0;
    return Math.round((migrationProgress.processed / migrationProgress.total) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Video className="h-5 w-5 mr-2" />
            Video Room Management
          </CardTitle>
          <CardDescription>
            Manage video room creation and monitor the migration process for existing appointments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {migrationStats.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin mr-2" />
              Loading statistics...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{migrationStats.total}</div>
                <div className="text-sm text-blue-800">Total Appointments</div>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{migrationStats.needingRooms}</div>
                <div className="text-sm text-orange-800">Need Video Rooms</div>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {migrationStats.total - migrationStats.needingRooms}
                </div>
                <div className="text-sm text-green-800">Have Video Rooms</div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button
              onClick={loadMigrationStats}
              variant="outline"
              size="sm"
              disabled={migrationStats.isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${migrationStats.isLoading ? 'animate-spin' : ''}`} />
              Refresh Stats
            </Button>

            {migrationStats.needingRooms > 0 && (
              <Button
                onClick={runFullMigration}
                disabled={isRunningMigration || migrationStats.isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isRunningMigration ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running Migration...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Create Missing Video Rooms
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Migration Progress */}
      {migrationProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Migration in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  Processing {migrationProgress.processed} of {migrationProgress.total} appointments
                </span>
                <span className="text-sm text-gray-500">
                  {getMigrationProgressPercentage()}%
                </span>
              </div>
              <Progress value={getMigrationProgressPercentage()} className="w-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                <span className="text-sm">Successful: {migrationProgress.successful}</span>
              </div>
              
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-600 mr-2" />
                <span className="text-sm">Failed: {migrationProgress.failed}</span>
              </div>
              
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm">Batch: {migrationProgress.currentBatch}</span>
              </div>
            </div>

            {migrationProgress.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {migrationProgress.errors.length} appointments failed to get video rooms. 
                  Check the console for detailed error information.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2" />
            Background Queue Status
          </CardTitle>
          <CardDescription>
            Monitor the background video room creation queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Queue Status:</span>
                <Badge variant={queueStatus.isProcessing ? "default" : "secondary"}>
                  {queueStatus.isProcessing ? 'Processing' : 'Idle'}
                </Badge>
              </div>
              
              <div className="flex items-center">
                <span className="text-sm font-medium mr-2">Pending:</span>
                <Badge variant="outline">
                  {queueStatus.pending}
                </Badge>
              </div>
            </div>

            <Button
              onClick={() => setQueueStatus(videoRoomService.getQueueStatus())}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>Automatic Creation:</strong> New appointments automatically get video rooms created in the background.
          </p>
          <p>
            <strong>Migration:</strong> Use the migration tool above to create video rooms for existing appointments that don't have them.
          </p>
          <p>
            <strong>Queue System:</strong> Video room creation is processed in batches to avoid overwhelming the Daily.co API.
          </p>
          <p>
            <strong>Status Indicators:</strong> Appointment cards show the status of their video rooms with options to recreate if needed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VideoRoomManagement;