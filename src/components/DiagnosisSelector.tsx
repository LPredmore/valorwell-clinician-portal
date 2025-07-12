import React, { useState, useEffect } from 'react';
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
export const DiagnosisSelector: React.FC<DiagnosisSelectorProps> = ({
  value,
  onChange
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const {
    data: icd10Codes,
    isLoading
  } = useICD10Codes(search);
  const [selectedCodes, setSelectedCodes] = useState<string[]>(value || []);

  // Update parent component when selections change
  useEffect(() => {
    onChange(selectedCodes);
  }, [selectedCodes, onChange]);

  // Update local state when value from parent changes
  useEffect(() => {
    setSelectedCodes(value || []);
  }, [value]);
  const handleSelect = (code: string) => {
    // Only add if not already in the list
    if (!selectedCodes.includes(code)) {
      setSelectedCodes([...selectedCodes, code]);
    }

    // Clear search and close popover
    setSearch("");
    setOpen(false);
  };
  const handleRemove = (codeToRemove: string) => {
    setSelectedCodes(selectedCodes.filter(code => code !== codeToRemove));
  };
  return <div className="space-y-4">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          
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

      {selectedCodes.length > 0 && <div className="flex flex-wrap gap-2">
          {selectedCodes.map(code => <Badge key={code} variant="secondary" className="py-1 px-2">
              {code}
              <button className="ml-2 rounded-full outline-none focus:outline-none" onClick={() => handleRemove(code)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>)}
        </div>}
    </div>;
};