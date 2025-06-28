
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
  type?: 'text' | 'textarea' | 'select' | 'multiselect';
  options?: string[];
  placeholder?: string;
  disabled?: boolean;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  label,
  value,
  onSave,
  type = 'text',
  options = [],
  placeholder,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving field:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsEditing(false);
  };

  const displayValue = () => {
    if (Array.isArray(value)) {
      return value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((item: string) => (
            <Badge key={item} variant="outline" className="text-xs">
              {item}
            </Badge>
          ))}
        </div>
      ) : 'Not specified';
    }
    return value || 'Not specified';
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
