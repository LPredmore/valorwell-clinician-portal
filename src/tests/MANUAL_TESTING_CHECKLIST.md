# Valorwell Clinician Portal Manual Testing Checklist

This checklist provides step-by-step instructions for manually testing critical functionality in the Valorwell Clinician Portal. Use this checklist to validate that all fixes work together properly in a real-world scenario.

## Prerequisites

- Test user accounts:
  - Clinician account with valid credentials
  - Admin account with valid credentials
  - Client account with valid credentials
- Google account for testing calendar integration
- Access to the development or staging environment

## 1. Authentication Testing

### 1.1 Login Flow

- [ ] **Standard Login**
  - Navigate to login page
  - Enter valid clinician credentials
  - Verify successful login and redirection to appropriate dashboard
  - Verify user information is displayed correctly

- [ ] **Invalid Login**
  - Navigate to login page
  - Enter invalid credentials
  - Verify appropriate error message is displayed
  - Verify user remains on login page

- [ ] **Password Reset**
  - Navigate to login page
  - Click "Forgot Password" link
  - Enter valid email address
  - Verify reset email is sent
  - Follow reset link and set new password
  - Verify login with new password works

### 1.2 Authentication Persistence

- [ ] **Session Persistence**
  - Login as clinician
  - Navigate to calendar page
  - Refresh the page
  - Verify user remains logged in
  - Verify calendar is still visible

- [ ] **Multiple Tab Authentication**
  - Login in one browser tab
  - Open application in another tab
  - Verify user is authenticated in both tabs

### 1.3 Protected Routes

- [ ] **Authenticated Access**
  - Login as clinician
  - Navigate to /calendar
  - Verify calendar page is accessible

- [ ] **Unauthenticated Access**
  - Logout
  - Attempt to navigate directly to /calendar
  - Verify redirection to login page

- [ ] **Role-Based Access**
  - Login as client
  - Attempt to access clinician-only routes
  - Verify appropriate redirection or access denial

## 2. Nylas OAuth Flow Testing

### 2.1 Calendar Connection

- [ ] **Initial Connection**
  - Login as clinician
  - Navigate to calendar page
  - Click "Connect Google Calendar"
  - Complete Google OAuth flow
  - Verify successful connection message
  - Verify connection appears in settings

- [ ] **Reconnection**
  - With existing connection
  - Disconnect Google Calendar
  - Reconnect Google Calendar
  - Verify reconnection works without errors

### 2.2 OAuth Error Handling

- [ ] **Cancellation Handling**
  - Start OAuth flow
  - Cancel the authorization
  - Verify appropriate error handling
  - Verify user can retry connection

- [ ] **Permission Denial**
  - Start OAuth flow
  - Deny required permissions
  - Verify appropriate error message
  - Verify user can retry with correct permissions

## 3. Calendar Integration Testing

### 3.1 Calendar Display

- [ ] **Valorwell Appointments**
  - Create a test appointment
  - Verify it appears in the calendar
  - Verify appointment details are correct

- [ ] **External Calendar Events**
  - Connect Google Calendar with existing events
  - Verify external events appear in calendar
  - Verify external event details are correct

- [ ] **Mixed Calendar View**
  - With both Valorwell appointments and external events
  - Verify all events are displayed correctly
  - Verify visual distinction between appointment types

### 3.2 Appointment Management

- [ ] **Create Appointment**
  - Click to create new appointment
  - Fill in appointment details
  - Save appointment
  - Verify it appears in Valorwell calendar
  - Verify it syncs to Google Calendar

- [ ] **Edit Appointment**
  - Select existing appointment
  - Modify details
  - Save changes
  - Verify changes appear in Valorwell calendar
  - Verify changes sync to Google Calendar

- [ ] **Delete Appointment**
  - Select existing appointment
  - Delete appointment
  - Verify it's removed from Valorwell calendar
  - Verify it's removed from Google Calendar

### 3.3 Timezone Testing

- [ ] **Different Timezone Display**
  - Change system timezone
  - View calendar
  - Verify events appear at correct local time

- [ ] **Create Appointment in Different Timezone**
  - Change system timezone
  - Create appointment
  - Change back to original timezone
  - Verify appointment appears at correct time

## 4. Error Handling Testing

### 4.1 API Error Recovery

- [ ] **Nylas API Unavailability**
  - Simulate Nylas API outage (can be done by disconnecting from internet temporarily)
  - Attempt calendar operations
  - Verify appropriate error message
  - Reconnect and verify recovery

- [ ] **Database Connection Issues**
  - Simulate database connection issue
  - Verify appropriate error handling
  - Verify recovery when connection is restored

### 4.2 Error Boundary Testing

- [ ] **Calendar Component Error**
  - Force an error in calendar component (can be done by providing invalid data)
  - Verify error boundary catches error
  - Verify fallback UI is displayed
  - Click "Try Again" and verify recovery

- [ ] **Application-Level Error**
  - Force an application-level error
  - Verify error boundary catches error
  - Verify fallback UI is displayed
  - Verify "Reload Page" button works

## 5. End-to-End User Journey Testing

### 5.1 Clinician Journey

- [ ] **Complete Clinician Flow**
  - Login as clinician
  - Connect Google Calendar
  - View integrated calendar
  - Create appointment
  - Edit appointment
  - Delete appointment
  - Verify all steps work correctly

### 5.2 Client Journey

- [ ] **Complete Client Flow**
  - Login as client
  - View appointments
  - Join video session
  - Complete session
  - Verify all steps work correctly

## 6. Performance Testing

### 6.1 Calendar Performance

- [ ] **Large Calendar Load**
  - With 50+ events in view
  - Verify calendar loads within acceptable time
  - Verify navigation between weeks is responsive

- [ ] **Concurrent Operations**
  - Perform multiple operations simultaneously
  - Verify application remains responsive
  - Verify operations complete correctly

## Test Results

| Test Area | Pass/Fail | Notes |
|-----------|-----------|-------|
| Authentication | | |
| Nylas OAuth Flow | | |
| Calendar Integration | | |
| Error Handling | | |
| End-to-End Journey | | |
| Performance | | |

## Issues Found

List any issues found during testing:

1. 
2. 
3. 

## Tester Information

- Tester Name: 
- Test Date: 
- Environment: 
- Browser: 
- Browser Version: 

## Additional Notes

Add any additional observations or notes here: