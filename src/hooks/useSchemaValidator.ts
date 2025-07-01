
import { useEffect } from 'react';
import { validateQuerySchema } from '@/utils/database.types';

export const useSchemaValidator = (tableName: string, selectString: string) => {
  useEffect(() => {
    try {
      validateQuerySchema(tableName, selectString);
      console.log(`✅ Schema validation passed for ${tableName}`);
    } catch (error) {
      console.error(`❌ Schema validation failed for ${tableName}:`, error);
      // In development, this will help catch field name mismatches early
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    }
  }, [tableName, selectString]);
};
