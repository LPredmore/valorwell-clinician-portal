import React from 'react';

// Different sizes for the loading indicator
type Size = 'xs' | 'sm' | 'md' | 'lg';

// Different types of loading indicators
type IndicatorType = 'spinner' | 'dots' | 'pulse';

interface ActionLoadingIndicatorProps {
  isLoading: boolean;
  size?: Size;
  type?: IndicatorType;
  text?: string;
  className?: string;
  color?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  inline?: boolean;
}

/**
 * ActionLoadingIndicator component
 * Displays a loading indicator for user actions
 */
const ActionLoadingIndicator: React.FC<ActionLoadingIndicatorProps> = ({
  isLoading,
  size = 'md',
  type = 'spinner',
  text,
  className = '',
  color = 'primary',
  inline = false
}) => {
  if (!isLoading) return null;
  
  // Size mappings
  const sizeMap: Record<Size, string> = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };
  
  // Color mappings
  const colorMap: Record<string, string> = {
    primary: 'text-blue-500',
    secondary: 'text-gray-500',
    success: 'text-green-500',
    danger: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-indigo-500'
  };
  
  // Get the appropriate size and color classes
  const sizeClass = sizeMap[size];
  const colorClass = colorMap[color];
  
  // Spinner indicator
  const renderSpinner = () => (
    <svg 
      className={`animate-spin ${sizeClass} ${colorClass}`} 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
  
  // Dots indicator
  const renderDots = () => (
    <div className="flex space-x-1">
      <div className={`${colorClass} ${size === 'lg' ? 'h-2 w-2' : 'h-1.5 w-1.5'} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`${colorClass} ${size === 'lg' ? 'h-2 w-2' : 'h-1.5 w-1.5'} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`${colorClass} ${size === 'lg' ? 'h-2 w-2' : 'h-1.5 w-1.5'} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
    </div>
  );
  
  // Pulse indicator
  const renderPulse = () => (
    <div className={`${sizeClass} ${colorClass} rounded-full animate-pulse bg-current opacity-75`}></div>
  );
  
  // Render the appropriate indicator based on type
  const renderIndicator = () => {
    switch (type) {
      case 'spinner':
        return renderSpinner();
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };
  
  // If inline, render the indicator inline with text
  if (inline) {
    return (
      <span className={`inline-flex items-center ${className}`}>
        <span className="mr-2">{renderIndicator()}</span>
        {text && <span>{text}</span>}
      </span>
    );
  }
  
  // Otherwise, render the indicator as a block
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {renderIndicator()}
      {text && <span className="mt-2 text-sm text-gray-600">{text}</span>}
    </div>
  );
};

export default ActionLoadingIndicator;