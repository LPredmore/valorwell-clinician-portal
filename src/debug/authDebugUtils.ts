
export const debugAuthOperation = async (operation: string, fn: () => Promise<any>) => {
  console.log(`[AuthDebug] Starting ${operation}`);
  const startTime = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    console.log(`[AuthDebug] ${operation} completed in ${duration}ms`, result);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[AuthDebug] ${operation} failed after ${duration}ms`, error);
    throw error;
  }
};

export const logAuthState = (context: string, state: any) => {
  console.log(`[AuthDebug] ${context}:`, {
    userId: state.userId,
    userRole: state.userRole,
    authInitialized: state.authInitialized,
    isLoading: state.isLoading,
    timestamp: new Date().toISOString()
  });
};
