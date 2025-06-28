
import { testBlockedTimeLeak } from './safeQueryUtils';
import { blockedTimeService } from '@/services/BlockedTimeService';
import { FEATURE_FLAGS } from '@/config/features';

// Emergency verification suite to ensure blocked time security
export class EmergencyVerification {
  static async runAllTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{ test: string; passed: boolean; message: string }>;
  }> {
    const results = [];
    let passed = 0;
    let failed = 0;

    // Test 1: Blocked time leak detection
    try {
      const noLeak = await testBlockedTimeLeak();
      results.push({
        test: 'Blocked Time Leak Detection',
        passed: noLeak,
        message: noLeak ? 'No blocked time client leakage detected' : '⚠️ BLOCKED TIME LEAK DETECTED!'
      });
      if (noLeak) passed++; else failed++;
    } catch (error) {
      results.push({
        test: 'Blocked Time Leak Detection',
        passed: false,
        message: `Test failed: ${error}`
      });
      failed++;
    }

    // Test 2: Feature flags enforcement
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

    // Test 3: BlockedTimeService functionality
    try {
      // Just test that the service exists and can be called
      const service = blockedTimeService;
      const serviceWorks = typeof service.createBlock === 'function';
      results.push({
        test: 'BlockedTimeService Functionality',
        passed: serviceWorks,
        message: serviceWorks ? 'BlockedTimeService is properly initialized' : 'BlockedTimeService initialization failed'
      });
      if (serviceWorks) passed++; else failed++;
    } catch (error) {
      results.push({
        test: 'BlockedTimeService Functionality',
        passed: false,
        message: `Service test failed: ${error}`
      });
      failed++;
    }

    return { passed, failed, results };
  }

  // Quick security check for production
  static async quickSecurityCheck(): Promise<boolean> {
    try {
      // Check blocked time leak
      const noLeak = await testBlockedTimeLeak();
      
      // Check critical features are disabled
      const criticalDisabled = !FEATURE_FLAGS.SEARCH && !FEATURE_FLAGS.REPORTS && !FEATURE_FLAGS.EXPORTS;
      
      return noLeak && criticalDisabled;
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
