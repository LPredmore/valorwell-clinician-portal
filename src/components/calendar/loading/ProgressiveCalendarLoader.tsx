import React, { useState, useEffect } from 'react';
import CalendarSkeleton from './CalendarSkeleton';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'ProgressiveCalendarLoader';

interface ProgressiveCalendarLoaderProps {
  children: React.ReactNode;
  isLoading: boolean;
  loadingPhase?: 'initial' | 'appointments' | 'availability' | 'complete';
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * ProgressiveCalendarLoader component
 * Provides a progressive loading experience for calendar data
 * Shows different loading states based on the loading phase
 */
const ProgressiveCalendarLoader: React.FC<ProgressiveCalendarLoaderProps> = ({
  children,
  isLoading,
  loadingPhase = 'initial',
  error,
  onRetry
}) => {
  // State to track loading progress
  const [progress, setProgress] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  
  // Update progress based on loading phase
  useEffect(() => {
    if (isLoading) {
      switch (loadingPhase) {
        case 'initial':
          setProgress(10);
          setShowSkeleton(true);
          break;
        case 'appointments':
          setProgress(40);
          setShowSkeleton(true);
          break;
        case 'availability':
          setProgress(70);
          setShowSkeleton(true);
          break;
        case 'complete':
          setProgress(90);
          // Keep skeleton for a moment before showing content
          const timer = setTimeout(() => {
            setProgress(100);
            setShowSkeleton(false);
          }, 500);
          return () => clearTimeout(timer);
        default:
          setProgress(50);
          setShowSkeleton(true);
      }
    } else {
      // When loading is complete
      setProgress(100);
      
      // Add a small delay before hiding skeleton for smoother transition
      const timer = setTimeout(() => {
        setShowSkeleton(false);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingPhase]);
  
  // Log loading progress
  useEffect(() => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'Loading progress updated', {
      progress,
      isLoading,
      loadingPhase,
      showSkeleton
    });
  }, [progress, isLoading, loadingPhase, showSkeleton]);
  
  // If there's an error, show error message with retry button
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50 rounded-lg border border-red-200">
        <div className="text-red-500 text-xl font-semibold mb-2">
          Error Loading Calendar
        </div>
        <div className="text-red-700 mb-4">
          {error.message || 'An unexpected error occurred while loading the calendar.'}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }
  
  // Show skeleton or children based on loading state
  return (
    <div className="relative">
      {/* Progress bar */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 z-10">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {/* Loading overlay with skeleton */}
      {showSkeleton ? (
        <div className="relative">
          <CalendarSkeleton />
          
          {/* Loading message */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="bg-white bg-opacity-90 px-6 py-3 rounded-lg shadow-lg">
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-gray-700 font-medium">
                  {loadingPhase === 'initial' && 'Initializing calendar...'}
                  {loadingPhase === 'appointments' && 'Loading appointments...'}
                  {loadingPhase === 'availability' && 'Loading availability...'}
                  {loadingPhase === 'complete' && 'Finalizing...'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default ProgressiveCalendarLoader;