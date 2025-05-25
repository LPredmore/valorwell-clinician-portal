import { CalendarDebugUtils } from './calendarDebugUtils';

// Component name for logging
const COMPONENT_NAME = 'LoadingStateMachine';

/**
 * Loading State Enum
 * Defines all possible loading states
 */
export enum LoadingState {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  LOADING_APPOINTMENTS = 'loading_appointments',
  LOADING_AVAILABILITY = 'loading_availability',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
  RECOVERY = 'recovery'
}

/**
 * Loading Event Enum
 * Defines all possible events that can trigger state transitions
 */
export enum LoadingEvent {
  START = 'start',
  LOAD_APPOINTMENTS = 'load_appointments',
  LOAD_AVAILABILITY = 'load_availability',
  PROCESS = 'process',
  COMPLETE = 'complete',
  FAIL = 'fail',
  RETRY = 'retry',
  RESET = 'reset'
}

/**
 * State Transition Type
 * Defines the structure of a state transition
 */
type StateTransition = {
  target: LoadingState;
  actions?: Array<(data?: any) => void>;
};

/**
 * State Machine Configuration Type
 * Defines the structure of the state machine configuration
 */
type StateMachineConfig = {
  [key in LoadingState]: {
    on: {
      [key in LoadingEvent]?: StateTransition;
    };
  };
};

/**
 * Loading State Machine
 * Manages loading states and transitions
 */
export class LoadingStateMachine {
  private state: LoadingState;
  private config: StateMachineConfig;
  private listeners: Array<(state: LoadingState, prevState: LoadingState, event: LoadingEvent) => void>;
  private errorHandlers: Array<(error: Error) => void>;
  private error: Error | null;
  private context: any;
  
  /**
   * Constructor
   * @param initialState The initial state of the machine
   * @param context Optional context data
   */
  constructor(initialState: LoadingState = LoadingState.IDLE, context: any = {}) {
    this.state = initialState;
    this.listeners = [];
    this.errorHandlers = [];
    this.error = null;
    this.context = context;
    
    // Define the state machine configuration
    this.config = {
      [LoadingState.IDLE]: {
        on: {
          [LoadingEvent.START]: { 
            target: LoadingState.INITIALIZING,
            actions: [this.logTransition]
          }
        }
      },
      [LoadingState.INITIALIZING]: {
        on: {
          [LoadingEvent.LOAD_APPOINTMENTS]: { 
            target: LoadingState.LOADING_APPOINTMENTS,
            actions: [this.logTransition]
          },
          [LoadingEvent.FAIL]: { 
            target: LoadingState.ERROR,
            actions: [this.logTransition, this.handleError]
          },
          [LoadingEvent.RESET]: { 
            target: LoadingState.IDLE,
            actions: [this.logTransition, this.resetError]
          }
        }
      },
      [LoadingState.LOADING_APPOINTMENTS]: {
        on: {
          [LoadingEvent.LOAD_AVAILABILITY]: { 
            target: LoadingState.LOADING_AVAILABILITY,
            actions: [this.logTransition]
          },
          [LoadingEvent.FAIL]: { 
            target: LoadingState.ERROR,
            actions: [this.logTransition, this.handleError]
          },
          [LoadingEvent.RESET]: { 
            target: LoadingState.IDLE,
            actions: [this.logTransition, this.resetError]
          }
        }
      },
      [LoadingState.LOADING_AVAILABILITY]: {
        on: {
          [LoadingEvent.PROCESS]: { 
            target: LoadingState.PROCESSING,
            actions: [this.logTransition]
          },
          [LoadingEvent.FAIL]: { 
            target: LoadingState.ERROR,
            actions: [this.logTransition, this.handleError]
          },
          [LoadingEvent.RESET]: { 
            target: LoadingState.IDLE,
            actions: [this.logTransition, this.resetError]
          }
        }
      },
      [LoadingState.PROCESSING]: {
        on: {
          [LoadingEvent.COMPLETE]: { 
            target: LoadingState.SUCCESS,
            actions: [this.logTransition]
          },
          [LoadingEvent.FAIL]: { 
            target: LoadingState.ERROR,
            actions: [this.logTransition, this.handleError]
          },
          [LoadingEvent.RESET]: { 
            target: LoadingState.IDLE,
            actions: [this.logTransition, this.resetError]
          }
        }
      },
      [LoadingState.SUCCESS]: {
        on: {
          [LoadingEvent.START]: { 
            target: LoadingState.INITIALIZING,
            actions: [this.logTransition, this.resetError]
          },
          [LoadingEvent.RESET]: { 
            target: LoadingState.IDLE,
            actions: [this.logTransition, this.resetError]
          }
        }
      },
      [LoadingState.ERROR]: {
        on: {
          [LoadingEvent.RETRY]: { 
            target: LoadingState.RECOVERY,
            actions: [this.logTransition]
          },
          [LoadingEvent.RESET]: { 
            target: LoadingState.IDLE,
            actions: [this.logTransition, this.resetError]
          }
        }
      },
      [LoadingState.RECOVERY]: {
        on: {
          [LoadingEvent.START]: { 
            target: LoadingState.INITIALIZING,
            actions: [this.logTransition, this.resetError]
          },
          [LoadingEvent.FAIL]: { 
            target: LoadingState.ERROR,
            actions: [this.logTransition, this.handleError]
          },
          [LoadingEvent.RESET]: { 
            target: LoadingState.IDLE,
            actions: [this.logTransition, this.resetError]
          }
        }
      }
    };
    
    // Log initial state
    CalendarDebugUtils.log(COMPONENT_NAME, 'State machine initialized', {
      initialState,
      context
    });
  }
  
  /**
   * Get the current state
   * @returns The current state
   */
  public getState(): LoadingState {
    return this.state;
  }
  
  /**
   * Get the current error
   * @returns The current error
   */
  public getError(): Error | null {
    return this.error;
  }
  
  /**
   * Get the current context
   * @returns The current context
   */
  public getContext(): any {
    return this.context;
  }
  
  /**
   * Update the context
   * @param context The new context
   */
  public updateContext(context: any): void {
    this.context = { ...this.context, ...context };
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'Context updated', {
      context: this.context
    });
  }
  
  /**
   * Send an event to the state machine
   * @param event The event to send
   * @param data Optional data to pass to actions
   * @returns Whether the transition was successful
   */
  public send(event: LoadingEvent, data?: any): boolean {
    const currentState = this.state;
    const stateConfig = this.config[currentState];
    
    if (!stateConfig) {
      CalendarDebugUtils.error(COMPONENT_NAME, `Invalid state: ${currentState}`);
      return false;
    }
    
    const transition = stateConfig.on[event];
    
    if (!transition) {
      CalendarDebugUtils.warn(COMPONENT_NAME, `No transition for event ${event} in state ${currentState}`);
      return false;
    }
    
    // Execute the transition
    const prevState = this.state;
    this.state = transition.target;
    
    // Execute actions
    if (transition.actions) {
      for (const action of transition.actions) {
        action.call(this, data);
      }
    }
    
    // Notify listeners
    this.notifyListeners(prevState, event);
    
    return true;
  }
  
  /**
   * Add a listener for state changes
   * @param listener The listener function
   */
  public addListener(listener: (state: LoadingState, prevState: LoadingState, event: LoadingEvent) => void): void {
    this.listeners.push(listener);
  }
  
  /**
   * Remove a listener
   * @param listener The listener function to remove
   */
  public removeListener(listener: (state: LoadingState, prevState: LoadingState, event: LoadingEvent) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }
  
  /**
   * Add an error handler
   * @param handler The error handler function
   */
  public addErrorHandler(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }
  
  /**
   * Remove an error handler
   * @param handler The error handler function to remove
   */
  public removeErrorHandler(handler: (error: Error) => void): void {
    this.errorHandlers = this.errorHandlers.filter(h => h !== handler);
  }
  
  /**
   * Notify all listeners of a state change
   * @param prevState The previous state
   * @param event The event that triggered the transition
   */
  private notifyListeners(prevState: LoadingState, event: LoadingEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state, prevState, event);
      } catch (error) {
        CalendarDebugUtils.error(COMPONENT_NAME, 'Error in state change listener', error);
      }
    }
  }
  
  /**
   * Log a state transition
   * @param data Optional data related to the transition
   */
  private logTransition = (data?: any): void => {
    CalendarDebugUtils.log(COMPONENT_NAME, 'State transition', {
      from: this.state,
      to: this.state,
      data
    });
  }
  
  /**
   * Handle an error
   * @param error The error to handle
   */
  private handleError = (error?: any): void => {
    if (error instanceof Error) {
      this.error = error;
    } else if (error) {
      this.error = new Error(String(error));
    }
    
    CalendarDebugUtils.error(COMPONENT_NAME, 'Error in state machine', this.error);
    
    // Notify error handlers
    for (const handler of this.errorHandlers) {
      try {
        handler(this.error!);
      } catch (handlerError) {
        CalendarDebugUtils.error(COMPONENT_NAME, 'Error in error handler', handlerError);
      }
    }
  }
  
  /**
   * Reset the error state
   */
  private resetError = (): void => {
    this.error = null;
    
    CalendarDebugUtils.log(COMPONENT_NAME, 'Error state reset');
  }
}

/**
 * Create a hook for using the loading state machine in React components
 */
export const createLoadingStateMachine = (
  initialState: LoadingState = LoadingState.IDLE,
  context: any = {}
): LoadingStateMachine => {
  return new LoadingStateMachine(initialState, context);
};

export default LoadingStateMachine;