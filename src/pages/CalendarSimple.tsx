
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/layout/Layout";

const CalendarSimple = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/calendar', { replace: true });
  }, [navigate]);

  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-sm p-6 animate-fade-in">
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p>Redirecting to the main calendar...</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

CalendarSimple.displayName = 'CalendarSimple';

export default CalendarSimple;
