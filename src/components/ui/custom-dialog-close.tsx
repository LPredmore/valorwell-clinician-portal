
import React from 'react';
import { Button } from './button';
import { DialogClose } from './dialog';

interface CustomDialogCloseProps {
  children: React.ReactNode;
  variant?: string;
  onClick?: () => void;
}

export const CustomDialogClose: React.FC<CustomDialogCloseProps> = ({ 
  children, 
  variant = "outline",
  onClick
}) => {
  return (
    <DialogClose asChild>
      <Button variant={variant as any} onClick={onClick}>
        {children}
      </Button>
    </DialogClose>
  );
};
