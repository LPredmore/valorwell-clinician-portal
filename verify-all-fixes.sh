#!/bin/bash

# verify-all-fixes.sh
# Comprehensive verification script for Valorwell Clinician Portal
# Tests all fixes implemented in Phases 1-3 of the strategic implementation plan

# Set colors for better readability
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print section headers
print_header() {
  echo -e "\n${BLUE}=========================================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}=========================================================${NC}\n"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error messages
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Function to print warning messages
print_warning() {
  echo -e "${YELLOW}! $1${NC}"
}

# Function to check if a file exists
check_file() {
  if [ -f "$1" ]; then
    print_success "File $1 exists"
    return 0
  else
    print_error "File $1 does not exist"
    return 1
  fi
}

# Function to check if a string exists in a file
check_string_in_file() {
  if grep -q "$2" "$1"; then
    print_success "Found '$2' in $1"
    return 0
  else
    print_error "Could not find '$2' in $1"
    return 1
  fi
}

# Function to run a test and record the result
run_test() {
  local test_name="$1"
  local test_command="$2"
  
  echo -e "\n${YELLOW}Testing: $test_name${NC}"
  
  if eval "$test_command"; then
    print_success "Test passed: $test_name"
    ((PASSED_TESTS++))
    echo "$test_name: PASSED" >> "$TEST_RESULTS_FILE"
  else
    print_error "Test failed: $test_name"
    ((FAILED_TESTS++))
    echo "$test_name: FAILED" >> "$TEST_RESULTS_FILE"
    FAILED_TEST_NAMES+=("$test_name")
  fi
}

# Initialize counters and results file
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_TEST_NAMES=()
TEST_RESULTS_FILE="verification_results.txt"
echo "Valorwell Clinician Portal Verification Results" > "$TEST_RESULTS_FILE"
echo "Date: $(date)" >> "$TEST_RESULTS_FILE"
echo "----------------------------------------" >> "$TEST_RESULTS_FILE"

# Start verification
print_header "Starting Comprehensive Verification (Phases 1-3)"

# Phase 1: Authentication System Fixes
print_header "Phase 1: Authentication System Fixes"

# Check for auth debug utilities
run_test "Auth Debug Utilities" "check_file src/debug/authDebugUtils.ts"

# Check for protected route component
run_test "Protected Route Component" "check_file src/components/auth/ProtectedRoute.tsx"

# Check for auth wrapper component
run_test "Auth Wrapper Component" "check_file src/components/auth/AuthWrapper.tsx"

# Check for auth provider context
run_test "Auth Provider Context" "check_file src/context/AuthProvider.tsx"

# Phase 2: Calendar Integration Fixes
print_header "Phase 2: Calendar Integration Fixes"

# Check for Nylas integration hooks
run_test "Nylas Events Hook" "check_file src/hooks/useNylasEvents.ts"
run_test "Nylas Integration Hook" "check_file src/hooks/useNylasIntegration.ts"

# Check for timezone utilities
run_test "Timezone Service" "check_file src/utils/timeZoneService.ts"

# Check for appointments hook
run_test "Appointments Hook" "check_file src/hooks/useAppointments.tsx"

# Check for calendar page
run_test "Calendar Page" "check_file src/pages/Calendar.tsx"

# Phase 3: Long-term Stability Improvements
print_header "Phase 3: Long-term Stability Improvements"

# Check for environment variable validation
run_test "Config Validation" "check_file src/utils/configValidation.ts"

# Check for progressive initialization in App.tsx
run_test "Progressive Initialization" "check_string_in_file src/App.tsx 'progressive initialization'"

# Check for dynamic imports in App.tsx
run_test "Dynamic Imports" "check_string_in_file src/App.tsx 'lazy('"

# Check for error handling in Nylas hooks
run_test "Nylas Error Handling" "check_string_in_file src/hooks/useNylasEvents.ts 'retry'"
run_test "Nylas Timeout Handling" "check_string_in_file src/hooks/useNylasEvents.ts 'timeout'"

# Check for timezone handling in appointments
run_test "Timezone Handling" "check_string_in_file src/hooks/useAppointments.tsx 'timezone'"

# Verify test files
print_header "Verifying Test Files"

# Check for test files
run_test "Authentication Tests" "check_file src/tests/auth/AuthenticationTests.tsx"
run_test "Calendar Integration Tests" "check_file src/tests/calendar/CalendarIntegrationTests.tsx"
run_test "Error Boundary Tests" "check_file src/tests/error-handling/ErrorBoundaryTests.tsx"
run_test "Nylas Integration Tests" "check_file src/tests/nylas/NylasIntegrationTests.tsx"

# Check for test plan and report
run_test "Test Plan" "check_file src/tests/TEST_PLAN.md"
run_test "Test Report" "check_file src/tests/TEST_REPORT.md"

# Run TypeScript type checking
print_header "Running TypeScript Type Checking"

if command -v npx &> /dev/null; then
  echo "Running TypeScript compiler check..."
  if npx tsc --noEmit; then
    print_success "TypeScript compilation successful"
    ((PASSED_TESTS++))
    echo "TypeScript Compilation: PASSED" >> "$TEST_RESULTS_FILE"
  else
    print_error "TypeScript compilation failed"
    ((FAILED_TESTS++))
    echo "TypeScript Compilation: FAILED" >> "$TEST_RESULTS_FILE"
    FAILED_TEST_NAMES+=("TypeScript Compilation")
  fi
else
  print_warning "npx not found, skipping TypeScript check"
fi

# Run ESLint if available
print_header "Running ESLint"

if command -v npx &> /dev/null && [ -f ".eslintrc.js" ]; then
  echo "Running ESLint check..."
  if npx eslint src --ext .ts,.tsx; then
    print_success "ESLint check passed"
    ((PASSED_TESTS++))
    echo "ESLint Check: PASSED" >> "$TEST_RESULTS_FILE"
  else
    print_error "ESLint check failed"
    ((FAILED_TESTS++))
    echo "ESLint Check: FAILED" >> "$TEST_RESULTS_FILE"
    FAILED_TEST_NAMES+=("ESLint Check")
  fi
else
  print_warning "ESLint not configured, skipping check"
fi

# Run Jest tests if available
print_header "Running Jest Tests"

if command -v npx &> /dev/null && [ -f "src/tests/jest.config.js" ]; then
  echo "Running Jest tests..."
  if npx jest --config src/tests/jest.config.js; then
    print_success "Jest tests passed"
    ((PASSED_TESTS++))
    echo "Jest Tests: PASSED" >> "$TEST_RESULTS_FILE"
  else
    print_error "Jest tests failed"
    ((FAILED_TESTS++))
    echo "Jest Tests: FAILED" >> "$TEST_RESULTS_FILE"
    FAILED_TEST_NAMES+=("Jest Tests")
  fi
else
  print_warning "Jest not configured properly, skipping tests"
fi

# Print summary
print_header "Verification Summary"
echo -e "Total tests: $((PASSED_TESTS + FAILED_TESTS))"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"

if [ ${#FAILED_TEST_NAMES[@]} -gt 0 ]; then
  echo -e "\n${RED}Failed tests:${NC}"
  for test_name in "${FAILED_TEST_NAMES[@]}"; do
    echo -e "  - $test_name"
  done
fi

# Write summary to results file
echo -e "\nSummary:" >> "$TEST_RESULTS_FILE"
echo "Total tests: $((PASSED_TESTS + FAILED_TESTS))" >> "$TEST_RESULTS_FILE"
echo "Passed: $PASSED_TESTS" >> "$TEST_RESULTS_FILE"
echo "Failed: $FAILED_TESTS" >> "$TEST_RESULTS_FILE"

if [ ${#FAILED_TEST_NAMES[@]} -gt 0 ]; then
  echo -e "\nFailed tests:" >> "$TEST_RESULTS_FILE"
  for test_name in "${FAILED_TEST_NAMES[@]}"; do
    echo "  - $test_name" >> "$TEST_RESULTS_FILE"
  done
fi

print_header "Verification Complete"
echo -e "Results saved to ${YELLOW}$TEST_RESULTS_FILE${NC}"

# Exit with appropriate status code
if [ $FAILED_TESTS -gt 0 ]; then
  exit 1
else
  exit 0
fi