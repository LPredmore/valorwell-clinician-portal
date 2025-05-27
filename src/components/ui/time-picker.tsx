
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TimePickerProps {
  value?: string; // Format: "HH:mm"
  onChange?: (time: string) => void;
  className?: string;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value = "09:00",
  onChange,
  className,
  disabled = false
}) => {
  const [selectedHour, setSelectedHour] = useState(9);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [is24Hour, setIs24Hour] = useState(true);
  const [isAM, setIsAM] = useState(true);

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [hourStr, minuteStr] = value.split(':');
      const hour = parseInt(hourStr);
      const minute = parseInt(minuteStr);
      
      setSelectedHour(hour);
      setSelectedMinute(minute);
      
      if (hour > 12 || hour === 0) {
        setIs24Hour(true);
      } else {
        setIsAM(hour < 12);
      }
    }
  }, [value]);

  // Update parent when time changes
  useEffect(() => {
    const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange?.(timeString);
  }, [selectedHour, selectedMinute, onChange]);

  const hours = is24Hour ? Array.from({length: 24}, (_, i) => i) : Array.from({length: 12}, (_, i) => i + 1);
  const minutes = Array.from({length: 12}, (_, i) => i * 5);

  const getHourPosition = (hour: number) => {
    const adjustedHour = is24Hour ? hour : (hour === 12 ? 0 : hour);
    const angle = (adjustedHour % 12) * 30 - 90;
    const radius = 70;
    const x = Math.cos(angle * Math.PI / 180) * radius;
    const y = Math.sin(angle * Math.PI / 180) * radius;
    return { x: x + 100, y: y + 100 };
  };

  const getMinutePosition = (minute: number) => {
    const angle = (minute / 5) * 30 - 90;
    const radius = 80;
    const x = Math.cos(angle * Math.PI / 180) * radius;
    const y = Math.sin(angle * Math.PI / 180) * radius;
    return { x: x + 100, y: y + 100 };
  };

  return (
    <div className={cn("flex flex-col items-center space-y-4", className)}>
      {/* Time Display */}
      <div className="text-2xl font-mono bg-gray-100 px-4 py-2 rounded-lg">
        {selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}
        {!is24Hour && (
          <span className="ml-2 text-sm">
            {isAM ? 'AM' : 'PM'}
          </span>
        )}
      </div>

      {/* Format Toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIs24Hour(true)}
          disabled={disabled}
          className={cn(
            "px-3 py-1 text-sm rounded",
            is24Hour ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          24H
        </button>
        <button
          type="button"
          onClick={() => setIs24Hour(false)}
          disabled={disabled}
          className={cn(
            "px-3 py-1 text-sm rounded",
            !is24Hour ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          12H
        </button>
      </div>

      {/* Clock Face */}
      <div className="relative">
        <svg width="200" height="200" className="border rounded-full bg-white">
          {/* Clock Circle */}
          <circle cx="100" cy="100" r="95" fill="none" stroke="#e5e7eb" strokeWidth="2" />
          
          {/* Hour Markers */}
          {hours.map((hour) => {
            const pos = getHourPosition(hour);
            const displayHour = is24Hour ? hour : (hour === 0 ? 12 : hour);
            return (
              <g key={hour}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="15"
                  fill={selectedHour === hour ? "#3b82f6" : "#f3f4f6"}
                  stroke="#d1d5db"
                  strokeWidth="1"
                  className={cn(
                    "cursor-pointer transition-colors",
                    !disabled && "hover:fill-blue-100",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                  onClick={() => !disabled && setSelectedHour(hour)}
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill={selectedHour === hour ? "white" : "#374151"}
                  className={cn("pointer-events-none select-none", disabled && "opacity-50")}
                >
                  {displayHour}
                </text>
              </g>
            );
          })}

          {/* Minute Markers */}
          {minutes.map((minute) => {
            const pos = getMinutePosition(minute);
            return (
              <g key={minute}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="12"
                  fill={selectedMinute === minute ? "#10b981" : "#f9fafb"}
                  stroke="#d1d5db"
                  strokeWidth="1"
                  className={cn(
                    "cursor-pointer transition-colors",
                    !disabled && "hover:fill-green-100",
                    disabled && "cursor-not-allowed opacity-50"
                  )}
                  onClick={() => !disabled && setSelectedMinute(minute)}
                />
                <text
                  x={pos.x}
                  y={pos.y + 3}
                  textAnchor="middle"
                  fontSize="10"
                  fill={selectedMinute === minute ? "white" : "#6b7280"}
                  className={cn("pointer-events-none select-none", disabled && "opacity-50")}
                >
                  {minute.toString().padStart(2, '0')}
                </text>
              </g>
            );
          })}

          {/* Center dot */}
          <circle cx="100" cy="100" r="3" fill="#374151" />
        </svg>
      </div>

      {/* AM/PM Toggle for 12-hour format */}
      {!is24Hour && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsAM(true)}
            disabled={disabled}
            className={cn(
              "px-4 py-2 text-sm rounded",
              isAM ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            AM
          </button>
          <button
            type="button"
            onClick={() => setIsAM(false)}
            disabled={disabled}
            className={cn(
              "px-4 py-2 text-sm rounded",
              !isAM ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            PM
          </button>
        </div>
      )}
    </div>
  );
};
