
import React from 'react';

// Feature flags for progressive re-enablement post Phase 2 migration
export const FEATURE_FLAGS = {
  SEARCH: true,         // ✅ Safe - Re-enabled with stealth architecture
  REPORTS: false,       // ⚠️ Testing phase - Enable 2023-08-10
  EXPORTS: false,       // ⚠️ Testing phase - Enable 2023-08-12
  BLOCKED_TIME: true,   // ✅ Pure INTERNAL_BLOCKED_TIME architecture
  CALENDAR_VIEW: true,  // ✅ Calendar functionality active
  APPOINTMENT_BOOKING: true, // ✅ Booking functionality active
  MONITORING: true,     // ✅ New monitoring dashboard active
  STEALTH_RENDERING: true // ✅ CSS stealth rendering active
} as const;

// Runtime feature check
export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature];
};

// Progressive enablement function for testing phase
export const enableTestingFeature = (feature: keyof typeof FEATURE_FLAGS) => {
  console.log(`🧪 TESTING: Enabling feature ${feature} for validation`);
  // In production, this would update via secure API
  return true;
};

// Emergency disable function for critical features
export const emergencyDisableFeature = (feature: keyof typeof FEATURE_FLAGS) => {
  console.warn(`🚨 EMERGENCY: Disabling feature ${feature} due to security concern`);
  // In production, this would update a config service
  return false;
};

// Feature gate component with enhanced security awareness
export const FeatureGate: React.FC<{
  feature: keyof typeof FEATURE_FLAGS;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  testingMessage?: string;
}> = ({ feature, children, fallback = null, testingMessage }) => {
  if (!isFeatureEnabled(feature)) {
    if (testingMessage) {
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 text-sm font-medium">
            🧪 Feature in Testing Phase
          </p>
          <p className="text-yellow-700 text-sm mt-1">{testingMessage}</p>
        </div>
      );
    }
    return <>{fallback}</>;
  }
  return <>{children}</>;
};

// System status configuration
export const SYSTEM_STATUS = {
  architecture: "pure_stealth",
  security_status: "active_monitoring", 
  leak_detection: "zero_incidents",
  feature_unlock: "in_progress",
  phase2_migration: "complete",
  auto_healing: "active"
} as const;

// Feature re-enablement schedule
export const FEATURE_SCHEDULE = {
  SEARCH: { status: "✅ Safe", date: "immediate", enabled: true },
  REPORTS: { status: "⚠️ Testing", date: "2023-08-10", enabled: false },
  EXPORTS: { status: "⚠️ Testing", date: "2023-08-12", enabled: false }
} as const;

// Validation checkpoints for feature re-enablement
export const VALIDATION_CHECKPOINTS = {
  END_TO_END_BOOKING: false,
  CONFLICT_DETECTION: false, 
  EXPORT_STEALTH_AUDIT: false
} as const;
