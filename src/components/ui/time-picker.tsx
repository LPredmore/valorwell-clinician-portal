
import * as React from "react"
import { Clock } from "lucide-react"
import { format, setHours, setMinutes } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

interface TimePickerProps {
  selected?: Date
  onSelect: (date?: Date) => void
  initialFocus?: boolean
}

export function TimePicker({ selected, onSelect, initialFocus }: TimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const minutes = [0, 15, 30, 45]
  
  const handleTimeChange = (type: 'hour' | 'minute', value: string) => {
    const date = selected || new Date()
    if (type === 'hour') {
      const newDate = setHours(date, parseInt(value))
      onSelect(newDate)
    } else {
      const newDate = setMinutes(date, parseInt(value))
      onSelect(newDate)
    }
  }
  
  return (
    <div className="p-3 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-1">
          <label className="text-sm font-medium leading-none">Hour</label>
          <Select
            value={selected ? format(selected, 'HH') : undefined}
            onValueChange={(value) => handleTimeChange('hour', value)}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Hour" />
            </SelectTrigger>
            <SelectContent>
              {hours.map((hour) => (
                <SelectItem key={hour} value={hour.toString().padStart(2, '0')}>
                  {hour.toString().padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium leading-none">Minute</label>
          <Select
            value={selected ? format(selected, 'mm') : undefined}
            onValueChange={(value) => handleTimeChange('minute', value)}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Minute" />
            </SelectTrigger>
            <SelectContent>
              {minutes.map((minute) => (
                <SelectItem key={minute} value={minute.toString().padStart(2, '0')}>
                  {minute.toString().padStart(2, '0')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
