
import React from 'react';

// Feature flags for emergency safeguards
export const FEATURE_FLAGS = {
  SEARCH: false,        // Disabled until safe filtering implemented
  REPORTS: false,       // Disabled until safe filtering implemented  
  EXPORTS: false,       // Disabled until safe filtering implemented
  BLOCKED_TIME: true,   // Only allow through BlockedTimeService
  CALENDAR_VIEW: true,  // Calendar functionality remains active
  APPOINTMENT_BOOKING: true // Booking functionality remains active
} as const;

// Runtime feature check
export const isFeatureEnabled = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature];
};

// Emergency disable function for critical features
export const emergencyDisableFeature = (feature: keyof typeof FEATURE_FLAGS) => {
  console.warn(`🚨 EMERGENCY: Disabling feature ${feature} due to security concern`);
  // In production, this would update a config service
  return false;
};

// Feature gate component
export const FeatureGate: React.FC<{
  feature: keyof typeof FEATURE_FLAGS;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ feature, children, fallback = null }) => {
  if (!isFeatureEnabled(feature)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
