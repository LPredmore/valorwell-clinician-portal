import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LoadingStateMachine, 
  LoadingState, 
  LoadingEvent 
} from '@/utils/loadingStateMachine';
import { CalendarDebugUtils } from '@/utils/calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'useLoadingStateMachine';

/**
 * Hook for using the loading state machine in React components
 * @param initialState The initial state of the machine
 * @param context Optional context data
 * @returns The loading state machine hook
 */
export const useLoadingStateMachine = (
  initialState: LoadingState = LoadingState.IDLE,
  context: any = {}
) => {
  // Create a ref to hold the state machine instance
  const stateMachineRef = useRef<LoadingStateMachine | null>(null);
  
  // State to track the current state and error
  const [state, setState] = useState<LoadingState>(initialState);
  const [error, setError] = useState<Error | null>(null);
  const [machineContext, setMachineContext] = useState<any>(context);
  
  // Initialize the state machine
  useEffect(() => {
    // Create a new state machine instance
    const machine = new LoadingStateMachine(initialState, context);
    
    // Add a listener to update the state
    const listener = (newState: LoadingState) => {
      setState(newState);
      setError(machine.getError());
      setMachineContext(machine.getContext());
      
      CalendarDebugUtils.log(COMPONENT_NAME, 'State updated', {
        state: newState,
        error: machine.getError(),
        context: machine.getContext()
      });
    };
    
    // Add an error handler
    const errorHandler = (error: Error) => {
      setError(error);
      
      CalendarDebugUtils.error(COMPONENT_NAME, 'Error in state machine', error);
    };
    
    // Add the listener and error handler
    machine.addListener(listener);
    machine.addErrorHandler(errorHandler);
    
    // Store the machine in the ref
    stateMachineRef.current = machine;
    
    // Clean up on unmount
    return () => {
      machine.removeListener(listener);
      machine.removeErrorHandler(errorHandler);
    };
  }, [initialState]);
  
  // Function to send events to the state machine
  const send = useCallback((event: LoadingEvent, data?: any) => {
    if (stateMachineRef.current) {
      return stateMachineRef.current.send(event, data);
    }
    return false;
  }, []);
  
  // Function to update the context
  const updateContext = useCallback((newContext: any) => {
    if (stateMachineRef.current) {
      stateMachineRef.current.updateContext(newContext);
      setMachineContext(stateMachineRef.current.getContext());
    }
  }, []);
  
  // Function to start the loading process
  const startLoading = useCallback(() => {
    return send(LoadingEvent.START);
  }, [send]);
  
  // Function to transition to loading appointments
  const loadAppointments = useCallback(() => {
    return send(LoadingEvent.LOAD_APPOINTMENTS);
  }, [send]);
  
  // Function to transition to loading availability
  const loadAvailability = useCallback(() => {
    return send(LoadingEvent.LOAD_AVAILABILITY);
  }, [send]);
  
  // Function to transition to processing
  const startProcessing = useCallback(() => {
    return send(LoadingEvent.PROCESS);
  }, [send]);
  
  // Function to complete the loading process
  const completeLoading = useCallback(() => {
    return send(LoadingEvent.COMPLETE);
  }, [send]);
  
  // Function to handle errors
  const handleError = useCallback((error: Error) => {
    return send(LoadingEvent.FAIL, error);
  }, [send]);
  
  // Function to retry after an error
  const retry = useCallback(() => {
    return send(LoadingEvent.RETRY);
  }, [send]);
  
  // Function to reset the state machine
  const reset = useCallback(() => {
    return send(LoadingEvent.RESET);
  }, [send]);
  
  // Helper function to check if the state is a loading state
  const isLoading = useCallback(() => {
    return state === LoadingState.INITIALIZING ||
           state === LoadingState.LOADING_APPOINTMENTS ||
           state === LoadingState.LOADING_AVAILABILITY ||
           state === LoadingState.PROCESSING ||
           state === LoadingState.RECOVERY;
  }, [state]);
  
  // Helper function to get the loading phase
  const getLoadingPhase = useCallback(() => {
    switch (state) {
      case LoadingState.INITIALIZING:
        return 'initial';
      case LoadingState.LOADING_APPOINTMENTS:
        return 'appointments';
      case LoadingState.LOADING_AVAILABILITY:
        return 'availability';
      case LoadingState.PROCESSING:
      case LoadingState.RECOVERY:
        return 'complete';
      default:
        return undefined;
    }
  }, [state]);
  
  // Return the hook API
  return {
    state,
    error,
    context: machineContext,
    send,
    updateContext,
    startLoading,
    loadAppointments,
    loadAvailability,
    startProcessing,
    completeLoading,
    handleError,
    retry,
    reset,
    isLoading,
    getLoadingPhase
  };
};

export default useLoadingStateMachine;