import React, { useEffect, useState, useRef } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FormFieldWrapperProps {
  control: any;
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'select';
  options?: string[];
  readOnly?: boolean;
  valueMapper?: (label: string) => string;
  labelMapper?: (value: string) => string;
  maxLength?: number;
  required?: boolean;
  defaultValue?: string;
  onValueCommit?: (name: string, value: string) => void;
}

const FormFieldWrapper: React.FC<FormFieldWrapperProps> = ({
  control,
  name,
  label,
  type = 'text',
  options = [],
  readOnly = false,
  valueMapper,
  labelMapper,
  maxLength,
  required = false,
  defaultValue,
  onValueCommit
}) => {
  // Add local state to maintain selected value
  const [localSelectedValue, setLocalSelectedValue] = useState<string | undefined>(defaultValue);
  const initialized = useRef<boolean>(false);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // For debugging purposes
        console.log(`FormFieldWrapper ${name} rendering with field value:`, field.value);
        console.log(`FormFieldWrapper ${name} local selected value:`, localSelectedValue);
        
        // Initialize the field value when the component mounts or when defaultValue changes
        useEffect(() => {
          // Only apply defaultValue if field value is undefined and we have a defaultValue
          if (defaultValue !== undefined && field.value === undefined && !initialized.current) {
            console.log(`FormFieldWrapper ${name} initializing with defaultValue:`, defaultValue);
            field.onChange(defaultValue);
            setLocalSelectedValue(defaultValue);
            initialized.current = true;
          }
        }, [defaultValue, field, name]);

        // Keep local state in sync with field value when field.value changes externally
        useEffect(() => {
          // Skip initial render if already initialized
          if (field.value !== undefined && field.value !== localSelectedValue) {
            console.log(`FormFieldWrapper ${name} external field value changed to:`, field.value);
            setLocalSelectedValue(field.value);
          }
        }, [field.value, name, localSelectedValue]);
        
        const handleSelectChange = (selectedValue: string) => {
          console.log(`FormFieldWrapper ${name} select changed to:`, selectedValue);
          
          // If a valueMapper is provided, map the selected option label to its actual value
          const valueToStore = valueMapper ? valueMapper(selectedValue) : selectedValue;
          
          // Update both the form field and our local state
          field.onChange(valueToStore);
          setLocalSelectedValue(selectedValue);
          initialized.current = true;
          
          // If onValueCommit is provided, call it to save the value immediately
          if (onValueCommit) {
            console.log(`FormFieldWrapper ${name} calling onValueCommit with:`, valueToStore);
            onValueCommit(name, valueToStore);
          }
        };
        
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          field.onChange(e);
          // If onValueCommit is provided, call it to save the value immediately
          if (onValueCommit) {
            console.log(`FormFieldWrapper ${name} input calling onValueCommit with:`, e.target.value);
            onValueCommit(name, e.target.value);
          }
        };

        // If a labelMapper is provided and we have a value, map the value to a display label
        const displayValue = (labelMapper && field.value) 
          ? labelMapper(field.value) 
          : field.value || localSelectedValue;

        return (
          <FormItem>
            <FormLabel>{label}{required && <span className="text-red-500 ml-1">*</span>}</FormLabel>
            <FormControl>
              {type === 'select' ? (
                <Select
                  onValueChange={handleSelectChange}
                  value={displayValue || ''}
                  disabled={readOnly}
                  required={required}
                >
                  <SelectTrigger className={readOnly ? "bg-gray-100" : ""}>
                    <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent className="bg-white z-50">
                    {options.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  {...field}
                  type={type}
                  readOnly={readOnly}
                  className={readOnly ? "bg-gray-100" : ""}
                  maxLength={maxLength}
                  required={required}
                  onChange={handleInputChange}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export default FormFieldWrapper;
