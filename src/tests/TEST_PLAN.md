# Valorwell Clinician Portal Test Plan

## Overview

This test plan outlines the comprehensive testing approach for the Valorwell Clinician Portal, focusing on validating that all fixes work together properly. The plan covers end-to-end integration testing, authentication and navigation testing, calendar integration testing, and error handling and recovery testing.

## Test Environment

- **Development Environment**: Local development server
- **Testing Tools**: Manual testing, browser developer tools, React DevTools
- **Browser Support**: Chrome, Firefox, Safari, Edge
- **Test Users**: Admin, Clinician, and Client test accounts

## 1. End-to-End Integration Testing

### 1.1 User Journey Testing

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| E2E-01 | Complete user journey from login to calendar integration | 1. Login as clinician<br>2. Navigate to calendar<br>3. Connect Google Calendar via Nylas<br>4. View integrated calendar events | User should be able to complete the entire flow without errors | High |
| E2E-02 | Appointment creation and synchronization | 1. Login as clinician<br>2. Create new appointment<br>3. Verify it appears in Valorwell calendar<br>4. Verify it syncs to Google Calendar | Appointment should be created and synced bidirectionally | High |
| E2E-03 | Client management workflow | 1. Login as clinician<br>2. Navigate to clients<br>3. Add/edit client<br>4. Schedule appointment for client<br>5. View appointment in calendar | Complete client management workflow should function correctly | Medium |

### 1.2 Nylas OAuth Flow Testing

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| OAUTH-01 | Nylas OAuth initialization | 1. Login as clinician<br>2. Navigate to calendar<br>3. Click "Connect Google Calendar" | OAuth popup should open with Google login | High |
| OAUTH-02 | OAuth callback handling | 1. Complete Google authentication<br>2. Observe callback handling | Callback should be processed correctly and connection established | High |
| OAUTH-03 | OAuth error handling | 1. Cancel OAuth flow<br>2. Observe error handling | Application should handle cancellation gracefully | Medium |

### 1.3 Calendar Event Synchronization

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| SYNC-01 | External calendar events display | 1. Connect Google Calendar<br>2. Navigate to calendar view | External events should appear correctly | High |
| SYNC-02 | Calendar event creation sync | 1. Create event in Valorwell<br>2. Check Google Calendar | Event should appear in Google Calendar | High |
| SYNC-03 | Calendar event update sync | 1. Update event in Valorwell<br>2. Check Google Calendar | Changes should sync to Google Calendar | Medium |
| SYNC-04 | Calendar event deletion sync | 1. Delete event in Valorwell<br>2. Check Google Calendar | Event should be removed from Google Calendar | Medium |

## 2. Authentication and Navigation Testing

### 2.1 Login Flow Testing

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| AUTH-01 | Standard login | 1. Navigate to login page<br>2. Enter valid credentials<br>3. Submit | User should be authenticated and redirected to appropriate dashboard | High |
| AUTH-02 | Login with invalid credentials | 1. Navigate to login page<br>2. Enter invalid credentials<br>3. Submit | Error message should be displayed, user remains on login page | High |
| AUTH-03 | Password reset flow | 1. Navigate to login page<br>2. Click "Forgot Password"<br>3. Complete reset flow | Password reset email should be sent, user should be able to reset password | Medium |

### 2.2 Authentication Persistence

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| PERSIST-01 | Session persistence across page refresh | 1. Login<br>2. Navigate to calendar<br>3. Refresh page | User should remain logged in, calendar should still be visible | High |
| PERSIST-02 | Session timeout handling | 1. Login<br>2. Wait for session timeout<br>3. Attempt to navigate | User should be redirected to login with appropriate message | Medium |
| PERSIST-03 | Multiple tab authentication | 1. Login in one tab<br>2. Open application in another tab | User should be authenticated in both tabs | Medium |

### 2.3 Protected Route Testing

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| ROUTE-01 | Protected route access when authenticated | 1. Login as clinician<br>2. Navigate to /calendar | User should access calendar page | High |
| ROUTE-02 | Protected route access when unauthenticated | 1. Logout<br>2. Attempt to navigate to /calendar | User should be redirected to login page | High |
| ROUTE-03 | Role-based access control | 1. Login as client<br>2. Attempt to access clinician-only routes | Client should be redirected to appropriate page with message | High |

## 3. Calendar Integration Testing

### 3.1 Google Calendar Connection

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| GCAL-01 | Initial Google Calendar connection | 1. Navigate to calendar<br>2. Click connect Google Calendar<br>3. Complete OAuth flow | Connection should be established successfully | High |
| GCAL-02 | Google Calendar reconnection | 1. With existing connection<br>2. Disconnect Google Calendar<br>3. Reconnect Google Calendar | Reconnection should work without errors | Medium |
| GCAL-03 | Multiple Google Calendar accounts | 1. Connect first Google account<br>2. Connect second Google account | Both accounts should be connected and events displayed | Low |

### 3.2 Calendar Event Display

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| DISP-01 | Calendar view with no events | 1. Login with new account<br>2. Navigate to calendar | Empty calendar should be displayed properly | Medium |
| DISP-02 | Calendar view with Valorwell events | 1. Create appointments<br>2. View calendar | Appointments should be displayed correctly | High |
| DISP-03 | Calendar view with external events | 1. Connect Google Calendar with events<br>2. View calendar | External events should be displayed correctly | High |
| DISP-04 | Calendar view with mixed events | 1. Have both Valorwell and external events<br>2. View calendar | All events should be displayed correctly with visual distinction | High |

### 3.3 Timezone Handling

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| TZ-01 | Event creation in different timezone | 1. Change system timezone<br>2. Create appointment<br>3. View in different timezone | Event should appear at correct time regardless of timezone | High |
| TZ-02 | External events timezone display | 1. Connect Google Calendar with events in different timezones<br>2. View calendar | Events should display at correct local time | High |
| TZ-03 | Timezone change handling | 1. View calendar<br>2. Change timezone setting<br>3. View calendar again | Events should adjust to new timezone correctly | Medium |

## 4. Error Handling and Recovery Testing

### 4.1 API Error Handling

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| ERR-01 | Nylas API unavailable | 1. Simulate Nylas API outage<br>2. Attempt calendar operations | Appropriate error message should be displayed, app should continue functioning | High |
| ERR-02 | Supabase API errors | 1. Simulate Supabase connection issues<br>2. Perform database operations | Errors should be caught and displayed appropriately | High |
| ERR-03 | Network connectivity loss | 1. Disconnect from network<br>2. Attempt operations<br>3. Reconnect | App should handle offline state and recover when connection is restored | Medium |

### 4.2 Error Boundary Testing

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| BOUND-01 | Calendar component error | 1. Inject error in calendar component<br>2. Observe behavior | CalendarErrorBoundary should catch error and display fallback UI | High |
| BOUND-02 | Application-level error | 1. Inject error at app level<br>2. Observe behavior | ErrorBoundary should catch error and display fallback UI | High |
| BOUND-03 | Error recovery | 1. Trigger error boundary<br>2. Click "Try Again" button | Component should attempt to recover from error | Medium |

### 4.3 Authentication Error Recovery

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| AUTH-ERR-01 | Session expiration handling | 1. Force session expiration<br>2. Attempt operation | User should be redirected to login with appropriate message | High |
| AUTH-ERR-02 | Invalid token handling | 1. Modify auth token to be invalid<br>2. Attempt operation | Application should detect invalid token and redirect to login | Medium |
| AUTH-ERR-03 | Concurrent logout handling | 1. Login in two tabs<br>2. Logout in one tab<br>3. Attempt operation in other tab | Second tab should detect auth state change and update accordingly | Medium |

## 5. Performance and Load Testing

### 5.1 Calendar Performance

| Test ID | Test Case | Steps | Expected Outcome | Priority |
|---------|-----------|-------|------------------|----------|
| PERF-01 | Calendar with many events | 1. Load calendar with 100+ events<br>2. Navigate between weeks | Calendar should render and navigate without significant lag | Medium |
| PERF-02 | Calendar initial load time | 1. Clear cache<br>2. Navigate to calendar page<br>3. Measure load time | Calendar should load within acceptable time (< 3 seconds) | Medium |
| PERF-03 | Calendar data caching | 1. Load calendar<br>2. Navigate away<br>3. Return to calendar | Return to calendar should be faster than initial load | Low |

## Test Data Requirements

1. **Test Users**:
   - Admin user account
   - Clinician user account
   - Client user account

2. **Calendar Test Data**:
   - Google account with calendar events
   - Predefined appointments in Valorwell system
   - Appointments spanning multiple days/weeks
   - Appointments in different timezones

3. **Client Test Data**:
   - Test clients with complete profiles
   - Test clients with incomplete profiles
   - Test clients with appointment history

## Test Execution Plan

1. **Preparation**:
   - Set up test environment with required test data
   - Ensure all test users have appropriate access
   - Prepare test tracking spreadsheet

2. **Execution Order**:
   - Authentication testing
   - Basic navigation testing
   - Calendar integration testing
   - End-to-end workflow testing
   - Error handling testing
   - Performance testing

3. **Reporting**:
   - Document test results for each test case
   - Track bugs and issues discovered
   - Prioritize fixes based on severity and impact

## Automated Testing Implementation

For critical functionality, implement automated tests using Jest and React Testing Library:

1. **Unit Tests**:
   - Authentication hooks and context
   - Calendar data processing functions
   - Timezone conversion utilities

2. **Integration Tests**:
   - Protected route behavior
   - Calendar event fetching and display
   - Appointment creation flow

3. **End-to-End Tests**:
   - Login to calendar navigation
   - Appointment creation and viewing
   - Calendar integration with Nylas

## Test Completion Criteria

Testing will be considered complete when:

1. All high-priority test cases have been executed and passed
2. Any high-severity bugs have been fixed and retested
3. End-to-end user journeys function correctly
4. Calendar integration with Nylas is verified working
5. Error handling mechanisms have been validated

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Nylas API changes | High | Monitor Nylas API documentation, implement version checking |
| Timezone calculation errors | High | Comprehensive timezone testing, use reliable libraries like Luxon |
| Authentication edge cases | High | Thorough testing of auth flows, implement proper error handling |
| Performance with large datasets | Medium | Performance testing with realistic data volumes, implement pagination |
| Browser compatibility issues | Medium | Cross-browser testing, use well-supported features |

## Conclusion

This test plan provides a comprehensive approach to validating the Valorwell Clinician Portal, with special focus on the integration between authentication, calendar functionality, and error handling. By following this plan, we can ensure that all components work together properly and provide a reliable experience for clinicians.