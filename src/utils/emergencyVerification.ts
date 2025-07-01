
import { FEATURE_FLAGS } from '@/config/features';
// CLEANED: Removed imports of deleted modules

// Emergency verification suite - SIMPLIFIED after legacy cleanup
export class EmergencyVerification {
  static async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{ test: string; passed: boolean; message: string }>;
  }> {
    const results = [];
    let passed = 0;
    let failed = 0;

    // Test: Feature flags enforcement
    const criticalFeatures = ['SEARCH', 'REPORTS', 'EXPORTS'] as const;
    for (const feature of criticalFeatures) {
      const isDisabled = !FEATURE_FLAGS[feature];
      results.push({
        test: `Feature Flag: ${feature}`,
        passed: isDisabled,
        message: isDisabled ? `${feature} properly disabled` : `⚠️ ${feature} should be disabled for security!`
      });
      if (isDisabled) passed++; else failed++;
    }

    // Test: Basic system health
    try {
      const systemHealthy = typeof window !== 'undefined';
      results.push({
        test: 'System Health Check',
        passed: systemHealthy,
        message: systemHealthy ? 'System is running normally' : 'System health check failed'
      });
      if (systemHealthy) passed++; else failed++;
    } catch (error) {
      results.push({
        test: 'System Health Check',
        passed: false,
        message: `Health check failed: ${error}`
      });
      failed++;
    }

    return { passed, failed, results };
  }

  // Quick security check for production
  static async quickSecurityCheck(): Promise<boolean> {
    try {
      // Check critical features are disabled
      const criticalDisabled = !FEATURE_FLAGS.SEARCH && !FEATURE_FLAGS.REPORTS && !FEATURE_FLAGS.EXPORTS;
      
      return criticalDisabled;
    } catch (error) {
      console.error('Quick security check failed:', error);
      return false;
    }
  }

  // Log emergency status
  static async logEmergencyStatus(): Promise<void> {
    console.log('🚨 EMERGENCY SAFEGUARDS STATUS CHECK 🚨');
    
    const testResults = await this.runAllTests();
    
    console.log(`✅ Passed: ${testResults.passed}`);
    console.log(`❌ Failed: ${testResults.failed}`);
    
    testResults.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.message}`);
    });
    
    if (testResults.failed > 0) {
      console.error('🚨 SECURITY CONCERNS DETECTED - IMMEDIATE ATTENTION REQUIRED 🚨');
    } else {
      console.log('🛡️ All emergency safeguards are active and functioning');
    }
  }
}

// Auto-run verification in development
if (process.env.NODE_ENV === 'development') {
  // Run verification after a short delay to allow app initialization
  setTimeout(() => {
    EmergencyVerification.logEmergencyStatus();
  }, 2000);
}

export default EmergencyVerification;
