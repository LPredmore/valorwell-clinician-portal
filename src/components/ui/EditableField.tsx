
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X } from 'lucide-react';

interface EditableFieldProps {
  label: string;
  value: string | string[] | null;
  onSave: (value: string | string[]) => Promise<void>;
  type?: 'text' | 'textarea' | 'select' | 'multiselect' | 'email';
  options?: string[];
  placeholder?: string;
  disabled?: boolean;
  valueMapper?: (displayValue: string) => string;
  labelMapper?: (value: string) => string;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder,
  disabled = false,
  valueMapper,
  labelMapper
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(() => {
    if (type === 'select' && labelMapper && value) {
      return labelMapper(value as string);
    }
    return value || '';
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Email validation
      if (type === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editValue as string)) {
          throw new Error('Please enter a valid email address');
        }
      }
      
      const valueToSave = valueMapper ? valueMapper(editValue as string) : editValue;
      await onSave(valueToSave);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving field:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (type === 'select' && labelMapper && value) {
      setEditValue(labelMapper(value as string));
    } else {
      setEditValue(value || '');
    }
    setIsEditing(false);
  };

  const displayValue = () => {
    if (Array.isArray(value)) {
      return value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((item: string) => (
            <Badge key={item} variant="outline" className="text-xs">
              {labelMapper ? labelMapper(item) : item}
            </Badge>
          ))}
        </div>
      ) : 'Not specified';
    }
    const displayText = labelMapper && value ? labelMapper(value as string) : value;
    return displayText || 'Not specified';
  };

  if (!isEditing) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-muted-foreground">{label}</label>
          {!disabled && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 p-0"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="text-sm mt-1">{displayValue()}</div>
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">{label}</label>
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-1">
          {type === 'textarea' ? (
            <Textarea
              value={editValue as string}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              rows={3}
            />
          ) : type === 'select' ? (
            <Select value={editValue as string} onValueChange={setEditValue}>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              value={editValue as string}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={placeholder}
              type={type === 'email' ? 'email' : 'text'}
            />
          )}
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isLoading}
        >
          <Save className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};
