import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import CalendarTest from '../debug/calendarTest';
import WeekViewDataTest from '../debug/WeekViewDataTest';
import { testWeekViewDataFunctionality } from '../debug/testWeekViewData';
import { testImports } from '../debug/importTest';

const CalendarTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [importResults, setImportResults] = useState<any>(null);

  useEffect(() => {
    // Run the test functions when the component mounts
    const results = testWeekViewDataFunctionality();
    setTestResults(results);
    
    const imports = testImports();
    setImportResults(imports);
  }, []);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Calendar Test Page</h1>
        <p className="mb-4">This page tests basic calendar functionality without using the complex calendar components.</p>
        
        {testResults && (
          <div className="mb-6 p-4 border rounded bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">WeekViewData Functionality Test</h2>
            <div className={`p-3 rounded ${testResults.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className={testResults.success ? 'text-green-800' : 'text-red-800'}>
                {testResults.success ? 'Tests passed!' : 'Tests failed!'}
              </p>
              {testResults.error && (
                <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
                  {testResults.error}
                </pre>
              )}
            </div>
          </div>
        )}
        
        {importResults && (
          <div className="mb-6 p-4 border rounded bg-gray-50">
            <h2 className="text-xl font-semibold mb-2">Import Tests</h2>
            <div className={`p-3 rounded ${importResults.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <p className={importResults.success ? 'text-green-800' : 'text-red-800'}>
                {importResults.success ? 'All imports successful!' : 'Import tests failed!'}
              </p>
              {importResults.error && (
                <pre className="mt-2 text-xs bg-red-50 p-2 rounded overflow-auto">
                  {importResults.error}
                </pre>
              )}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-6 mb-6">
          <CalendarTest />
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Direct Hook Test</h2>
            <p className="mb-4">This test directly uses the useWeekViewData hook to identify any issues:</p>
            <WeekViewDataTest />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CalendarTestPage;