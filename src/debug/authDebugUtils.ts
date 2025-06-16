
// Simple debug utility for authentication operations
export const debugAuthOperation = async (operationName: string, operation: () => Promise<any>) => {
  console.log(`[AuthDebug] Starting ${operationName}`);
  try {
    const result = await operation();
    console.log(`[AuthDebug] ${operationName} completed successfully:`, result);
    return result;
  } catch (error) {
    console.error(`[AuthDebug] ${operationName} failed:`, error);
    throw error;
  }
};
