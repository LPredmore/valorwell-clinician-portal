
import React from 'react';

interface CalendarLegendProps {
  blockedCount: number;
  internalCount: number;
  externalCount: number;
  availableCount: number;
}

const CalendarLegend: React.FC<CalendarLegendProps> = ({
  blockedCount,
  internalCount,
  externalCount,
  availableCount,
}) => {
  return (
    <div className="calendar-legend">
      {internalCount > 0 && (
        <div className="legend-item">
          <div className="legend-dot internal"></div>
          <span>Appointments ({internalCount})</span>
        </div>
      )}
      
      {blockedCount > 0 && (
        <div className="legend-item">
          <div className="legend-dot blocked"></div>
          <span>🚫 Blocked Time ({blockedCount})</span>
        </div>
      )}
      
      {externalCount > 0 && (
        <div className="legend-item">
          <div className="legend-dot external"></div>
          <span>📅 External Events ({externalCount})</span>
        </div>
      )}
      
      {availableCount > 0 && (
        <div className="legend-item">
          <div className="legend-dot available"></div>
          <span>✅ Available ({availableCount})</span>
        </div>
      )}
    </div>
  );
};

export default CalendarLegend;
