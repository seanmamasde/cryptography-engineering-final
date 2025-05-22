// src/components/DatabaseStatus.tsx
import React, { useEffect, useState } from "react";

interface StatusState {
  isChecking: boolean;
  isReady: boolean;
  message: string;
}

export const DatabaseStatus: React.FC = () => {
  const [status, setStatus] = useState<StatusState>({
    isChecking: true, 
    isReady: false,
    message: "Checking database status..."
  });

  useEffect(() => {
    const checkDatabase = async () => {
      try {
        const response = await fetch("/api/system/db-status");
        const data = await response.json();
        
        if (response.ok) {
          setStatus({
            isChecking: false,
            isReady: true,
            message: "Database is ready"
          });
        } else {
          setStatus({
            isChecking: false,
            isReady: false,
            message: data.message || "Database error occurred"
          });
        }
      } catch (error) {
        setStatus({
          isChecking: false,
          isReady: false,
          message: "Failed to check database status"
        });
      }
    };

    checkDatabase();
  }, []);

  if (status.isReady) return null; // Don't show anything if database is ready

  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-md z-50 ${
      status.isChecking 
        ? "bg-yellow-100 text-yellow-800" 
        : "bg-red-100 text-red-800"
    }`}>
      <div className="flex items-center">
        {status.isChecking ? (
          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        <span>{status.message}</span>
      </div>
    </div>
  );
};
