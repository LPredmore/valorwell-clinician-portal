# Calendar Loading Issues and Fixes

This document provides a comprehensive summary of the calendar loading issues we identified and the fixes implemented to address them. It serves as a reference for future developers working on the calendar system.

## 1. Issues Identified

### 1.1 Timezone Handling Issues

- **Object Conversion Problem**: Timezone strings were being converted to objects during state updates, causing rendering errors and timezone mismatches.
- **Inconsistent Timezone Formats**: Different parts of the code were using different timezone formats (IANA vs. non-standard), leading to conversion errors.
- **JSON Serialization Issues**: Using `JSON.parse(JSON.stringify())` for cloning objects was corrupting timezone string properties.

### 1.2 Data Loading and Processing Issues

- **Incorrect Query Logic**: The availability blocks query was using incorrect date range logic, causing some blocks to be missed.
- **Client-Therapist Relationship**: The code was using `clinician_id` instead of `client_assigned_therapist` when fetching client data.
- **Appointment Filtering**: Appointments were being filtered too aggressively, causing some to not appear in the calendar view.

### 1.3 Performance Issues

- **Inefficient Data Processing**: The calendar was processing all data at once without proper memoization, causing performance bottlenecks.
- **Redundant Calculations**: Time blocks and appointment blocks were being recalculated unnecessarily.
- **Missing Performance Tracking**: There was no way to identify slow operations in the calendar loading process.

### 1.4 Error Handling Issues

- **Insufficient Error Reporting**: Calendar errors were not being properly captured and reported.
- **No Recovery Mechanisms**: When errors occurred, there was no way to recover gracefully.
- **Poor User Feedback**: Users weren't receiving clear information about what went wrong.

## 2. Implemented Fixes

### 2.1 Timezone Handling Improvements

- **Safe Cloning Function**: Implemented a `safeClone` function that preserves string types during object cloning, replacing the problematic `JSON.parse(JSON.stringify())` approach.
- **Explicit String Conversion**: Added explicit string type conversion for timezone values to prevent object conversion issues.
- **Timezone Validation**: Added the `ensureIANATimeZone` function to validate and normalize timezone strings.

```typescript
// Special handling for timezone strings to prevent object conversion
if (key === 'timezone' && typeof value === 'string') {
  cloned[key] = String(value); // Ensure it's a primitive string
} else {
  cloned[key] = safeClone(value);
}
```

### 2.2 Data Loading and Query Fixes

- **Corrected Query Logic**: Fixed the availability blocks query to use proper date range logic.
```typescript
// FIXED: Corrected the query logic
.gte('start_at', utcStart)
.lt('end_at', utcEnd)   // This is correct logic: blocks starting in our range
```

- **Fixed Client Relationship**: Updated the client data query to use the correct relationship field.
```typescript
// FIXED: Use client_assigned_therapist instead of clinician_id
.eq('client_assigned_therapist', clinicianId.toString())
```

- **Expanded Date Range**: Added padding to the date range to ensure all relevant data is captured.
```typescript
// Get expanded date range for better data capture - add padding
// Start a week before the displayed week, end a week after
const padStartDay = firstDay.minus({ days: 7 });
const padEndDay = firstDay.plus({ days: 21 }); // current week (7) + padding (14)
```

### 2.3 Performance Optimizations

- **Memoization**: Added proper memoization to prevent unnecessary recalculations.
- **Parallel Data Fetching**: Implemented parallel data fetching using `Promise.all`.
```typescript
const [appointmentData, availabilityData, clientData, exceptionData] = await Promise.all([
  // Fetch appointments if no external appointments provided
  // ...
  // Fetch availability blocks
  // ...
  // Fetch client data once
  // ...
  // Fetch availability exceptions
  // ...
]);
```

- **Performance Tracking**: Added performance measurement for key operations.
```typescript
// Log data fetch completion time
const dataFetchTime = performance.now() - dataFetchStartTime.current;
CalendarDebugUtils.logPerformance(COMPONENT_NAME, 'data-fetch-complete', dataFetchTime, {
  appointmentsSuccess: !appointmentData.error,
  availabilitySuccess: !availabilityData.error,
  clientsSuccess: !clientData.error,
  exceptionsSuccess: !exceptionData.error
});
```

### 2.4 Enhanced Error Handling

- **Comprehensive Error Reporter**: Implemented the `CalendarErrorReporter` class for centralized error handling.
- **Recovery Options**: Added mechanisms to recover from certain types of errors.
- **User-Friendly Error Messages**: Improved error messages to be more helpful to users.
```typescript
public static formatUserErrorMessage(
  error: Error,
  context: ErrorContextData
): string {
  // Start with a generic message
  let message = 'An error occurred while loading the calendar.';

  // Customize based on context and error type
  if (context.operation === 'useWeekViewData') {
    message = 'An error occurred while loading calendar data.';
  } else if (context.operation === 'handleAppointmentClick') {
    message = 'An error occurred while opening the appointment details.';
  }
  // ...
}
```

### 2.5 Debugging Tools

- **Debug Utilities**: Created comprehensive debugging utilities in `CalendarDebugUtils`.
- **Test Components**: Implemented test components like `WeekViewDataTest` and `TimeSlotTester`.
- **Debug Page**: Created a dedicated `CalendarDebugPage` for testing calendar functionality.

## 3. Testing Instructions

To test the calendar fixes, use the diagnostic build and test page:

1. **Access the Debug Page**:
   - Navigate to `/calendar-debug` in the application
   - This page provides tools to test various aspects of the calendar

2. **Basic Calendar Tests**:
   - Click the "Run Basic Tests" button to verify DateTime functionality
   - This tests timezone conversion, week calculation, and other core functions

3. **useWeekViewData Hook Test**:
   - Click the "Test Hook" button to test the useWeekViewData hook directly
   - This verifies that the hook can process days, appointments, and availability correctly

4. **Component Tests**:
   - Navigate to `/calendar-test` to test the calendar components
   - This shows a simplified calendar view to verify rendering

5. **Timezone Testing**:
   - Change your system timezone and refresh the page
   - Verify that appointments and availability blocks appear at the correct times

6. **Performance Testing**:
   - Open the browser console to view performance metrics
   - Look for log entries with "performance" to see timing information

## 4. Future Improvement Recommendations

### 4.1 Code Structure Improvements

- **Component Refactoring**: Break down the calendar components into smaller, more focused components
- **Custom Hooks**: Create additional custom hooks for specific functionality (e.g., useAppointmentDrag, useAvailabilityBlocks)
- **Type Safety**: Improve TypeScript types throughout the calendar system

### 4.2 Performance Enhancements

- **Virtualization**: Implement virtualization for large calendars to improve rendering performance
- **Incremental Loading**: Load data incrementally as the user navigates the calendar
- **Worker Threads**: Move heavy calculations to web workers

### 4.3 User Experience Improvements

- **Loading States**: Add better loading indicators for calendar operations
- **Error Recovery UI**: Provide user-friendly interfaces for recovering from errors
- **Offline Support**: Add offline capabilities for viewing calendar data

### 4.4 Testing and Monitoring

- **Automated Tests**: Implement comprehensive unit and integration tests for calendar functionality
- **Error Monitoring**: Integrate with a production error monitoring service
- **Performance Monitoring**: Add real-user monitoring for calendar performance

### 4.5 Data Management

- **Caching Strategy**: Implement a more sophisticated caching strategy for calendar data
- **Optimistic Updates**: Add optimistic updates for appointment changes
- **Real-time Updates**: Implement real-time updates for calendar data changes

## 5. Calendar Verification Checklist

Use this checklist to verify that the calendar is working properly:

- [ ] **Basic Rendering**
  - [ ] Calendar loads without errors
  - [ ] Week view shows correct dates
  - [ ] Time slots are displayed correctly

- [ ] **Appointment Display**
  - [ ] Appointments appear in the correct time slots
  - [ ] Appointment details (client name, time) are correct
  - [ ] Appointments spanning multiple time slots display correctly

- [ ] **Availability Blocks**
  - [ ] Availability blocks appear in the correct time slots
  - [ ] Recurring availability patterns are displayed correctly
  - [ ] Availability exceptions are handled properly

- [ ] **Timezone Handling**
  - [ ] Calendar displays correctly in the user's timezone
  - [ ] Changing timezone updates the calendar correctly
  - [ ] Appointments created in different timezones display correctly

- [ ] **Performance**
  - [ ] Calendar loads within acceptable time (< 2 seconds)
  - [ ] Scrolling and navigation are smooth
  - [ ] No visible lag when interacting with appointments

- [ ] **Error Handling**
  - [ ] Network errors are handled gracefully
  - [ ] Data format errors are handled properly
  - [ ] User receives helpful error messages

- [ ] **Data Operations**
  - [ ] Creating a new appointment works correctly
  - [ ] Updating an appointment updates the calendar
  - [ ] Deleting an appointment removes it from the calendar

---

This document was created on May 24, 2025, to summarize the calendar loading issues and fixes. It should be updated as additional improvements are made to the calendar system.