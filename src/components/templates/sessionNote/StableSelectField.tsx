import React, { memo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

interface StableSelectFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: Array<{ value: string; label: string }>;
  label: string;
  className?: string;
}

export const StableSelectField: React.FC<StableSelectFieldProps> = memo(({
  value,
  onValueChange,
  placeholder,
  options,
  label,
  className = ""
}) => {
  return (
    <div className={`min-h-[80px] ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <Select 
        value={value || ""}
        onValueChange={onValueChange}
      >
        <SelectTrigger className="w-full bg-background border-input transition-none">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-background border border-border shadow-lg z-50 animate-none">
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="transition-none"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {/* Hidden span for PDF rendering */}
      <span className="hidden pdf-only" data-pdf-value={value}>
        {value}
      </span>
    </div>
  );
});

StableSelectField.displayName = 'StableSelectField';