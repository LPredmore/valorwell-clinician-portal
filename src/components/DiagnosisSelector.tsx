import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useICD10Codes } from "@/hooks/useICD10Codes";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface DiagnosisSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export const DiagnosisSelector: React.FC<DiagnosisSelectorProps> = React.memo(({
  value,
  onChange
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const {
    data: icd10Codes,
    isLoading
  } = useICD10Codes(search);

  // Memoize the current value to prevent unnecessary re-renders
  const currentCodes = useMemo(() => value || [], [value]);

  const handleSelect = useCallback((code: string) => {
    // Only add if not already in the list
    if (!currentCodes.includes(code)) {
      onChange([...currentCodes, code]);
    }

    // Clear search and close popover
    setSearch("");
    setOpen(false);
  }, [currentCodes, onChange]);

  const handleRemove = useCallback((codeToRemove: string) => {
    onChange(currentCodes.filter(code => code !== codeToRemove));
  }, [currentCodes, onChange]);
  return <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full justify-start text-left font-normal"
            type="button"
          >
            {currentCodes.length === 0 ? (
              <span className="text-muted-foreground">Select diagnosis codes...</span>
            ) : (
              <span>{currentCodes.length} diagnosis code{currentCodes.length > 1 ? 's' : ''} selected</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput placeholder="Search ICD-10 codes..." value={search} onValueChange={setSearch} />
            <CommandList>
              <CommandEmpty>No matches found</CommandEmpty>
              {isLoading ? <div className="p-2 text-sm text-muted-foreground">Loading...</div> : <CommandGroup>
                  {icd10Codes?.map(code => <CommandItem key={code.id} value={`${code.icd10} - ${code.diagnosis_name}`} onSelect={() => handleSelect(code.icd10)}>
                      <span className="font-medium">{code.icd10}</span>
                      <span className="ml-2 text-muted-foreground">{code.diagnosis_name}</span>
                    </CommandItem>)}
                </CommandGroup>}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {currentCodes.length > 0 && <div className="flex flex-wrap gap-2">
          {currentCodes.map(code => <Badge key={code} variant="secondary" className="py-1 px-2">
              {code}
              <button className="ml-2 rounded-full outline-none focus:outline-none" onClick={() => handleRemove(code)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>)}
        </div>}
    </div>;
});