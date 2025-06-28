
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertTriangle, Shield } from 'lucide-react';
import { SYSTEM_STATUS, FEATURE_SCHEDULE, VALIDATION_CHECKPOINTS } from '@/config/features';

const SystemStatusDashboard: React.FC = () => {
  const getStatusIcon = (status: string) => {
    if (status.includes('✅')) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status.includes('⚠️')) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Clock className="h-4 w-4 text-blue-500" />;
  };

  const getStatusBadge = (enabled: boolean, status: string) => {
    if (enabled) return <Badge variant="default">Active</Badge>;
    if (status.includes('Testing')) return <Badge variant="secondary">Testing</Badge>;
    return <Badge variant="outline">Disabled</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* System Architecture Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="h-5 w-5 mr-2" />
            System Architecture Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-800">Architecture</div>
              <div className="text-xs text-green-600 mt-1">{SYSTEM_STATUS.architecture}</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Security</div>
              <div className="text-xs text-blue-600 mt-1">{SYSTEM_STATUS.security_status}</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-sm font-medium text-purple-800">Leak Detection</div>
              <div className="text-xs text-purple-600 mt-1">{SYSTEM_STATUS.leak_detection}</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-sm font-medium text-yellow-800">Feature Unlock</div>
              <div className="text-xs text-yellow-600 mt-1">{SYSTEM_STATUS.feature_unlock}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Re-enablement Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Feature Re-enablement Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(FEATURE_SCHEDULE).map(([feature, config]) => (
              <div key={feature} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(config.status)}
                  <div>
                    <div className="font-medium">{feature}</div>
                    <div className="text-sm text-gray-500">
                      Activation: {config.date}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">{config.status}</span>
                  {getStatusBadge(config.enabled, config.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validation Checkpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Final Verification Checkpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className={`h-4 w-4 ${VALIDATION_CHECKPOINTS.END_TO_END_BOOKING ? 'text-green-500' : 'text-gray-300'}`} />
                <span>Complete end-to-end appointment booking test cycle</span>
              </div>
              <Badge variant={VALIDATION_CHECKPOINTS.END_TO_END_BOOKING ? "default" : "outline"}>
                {VALIDATION_CHECKPOINTS.END_TO_END_BOOKING ? "Complete" : "Pending"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className={`h-4 w-4 ${VALIDATION_CHECKPOINTS.CONFLICT_DETECTION ? 'text-green-500' : 'text-gray-300'}`} />
                <span>Validate conflict detection with mixed appointment types</span>
              </div>
              <Badge variant={VALIDATION_CHECKPOINTS.CONFLICT_DETECTION ? "default" : "outline"}>
                {VALIDATION_CHECKPOINTS.CONFLICT_DETECTION ? "Complete" : "Pending"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle className={`h-4 w-4 ${VALIDATION_CHECKPOINTS.EXPORT_STEALTH_AUDIT ? 'text-green-500' : 'text-gray-300'}`} />
                <span>Audit all export outputs for stealth integrity</span>
              </div>
              <Badge variant={VALIDATION_CHECKPOINTS.EXPORT_STEALTH_AUDIT ? "default" : "outline"}>
                {VALIDATION_CHECKPOINTS.EXPORT_STEALTH_AUDIT ? "Complete" : "Pending"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Note */}
      <Card>
        <CardHeader>
          <CardTitle>System Maintenance Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">🚀 Architectural Completion</p>
            <p className="text-green-700 text-sm mt-2">
              The system now auto-heals - any future blocked time is inherently invisible 
              without additional filtering. Phase 2 migration complete with pure stealth architecture.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemStatusDashboard;
