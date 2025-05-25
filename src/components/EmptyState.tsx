
import * as React from 'react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  contextData?: any;
}

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  contextData,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

interface DataEmptyStateProps extends EmptyStateProps {
  componentName: string;
  onRetry?: () => void;
}

export const DataEmptyState = ({
  componentName,
  onRetry,
  ...props
}: DataEmptyStateProps) => {
  return (
    <EmptyState
      {...props}
      action={onRetry ? {
        label: 'Retry',
        onClick: () => {
          console.log(`Retry attempted for ${componentName}`);
          onRetry();
        },
      } : undefined}
    />
  );
};

export default EmptyState;
