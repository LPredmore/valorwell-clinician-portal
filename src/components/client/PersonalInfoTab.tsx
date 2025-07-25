import React from 'react';
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Clock } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TabProps } from '@/types/client';
import { timezoneOptions } from '@/utils/timezoneOptions';
import { DiagnosisSelector } from '@/components/DiagnosisSelector';
const PersonalInfoTab: React.FC<TabProps> = ({
  isEditing,
  form,
  clientData
}) => {
  return <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="client_first_name" render={({
            field
          }) => <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            <FormField control={form.control} name="client_last_name" render={({
            field
          }) => <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            <FormField control={form.control} name="client_preferred_name" render={({
            field
          }) => <FormItem>
                  <FormLabel>Preferred Name</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            <FormField control={form.control} name="client_email" render={({
            field
          }) => <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            <FormField control={form.control} name="client_phone" render={({
            field
          }) => <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            <FormField control={form.control} name="client_date_of_birth" render={({
            field
          }) => <FormItem className="flex flex-col">
                  <FormLabel>Date of Birth</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={!isEditing}>
                          {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} disabled={date => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>} />
            <FormField control={form.control} name="client_age" render={({
            field
          }) => <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            <FormField control={form.control} name="client_gender" render={({
            field
          }) => <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <Select disabled={!isEditing} onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Non-binary">Non-binary</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>} />
            <FormField control={form.control} name="client_gender_identity" render={({
            field
          }) => <FormItem>
                  <FormLabel>Gender Identity</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            <FormField control={form.control} name="client_address" render={({
            field
          }) => <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} readOnly={!isEditing} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />
            <div className="grid grid-cols-3 gap-2">
              <FormField control={form.control} name="client_city" render={({
              field
            }) => <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              <FormField control={form.control} name="client_state" render={({
              field
            }) => <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              <FormField control={form.control} name="client_zip_code" render={({
              field
            }) => <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
            </div>
            <FormField control={form.control} name="client_time_zone" render={({
            field
          }) => <FormItem>
                  <FormLabel>Time Zone</FormLabel>
                  {isEditing ? <Select disabled={!isEditing} onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select time zone">
                            {field.value ? <div className="flex items-center">
                                <Clock className="mr-2 h-4 w-4" />
                                <span>
                                  {timezoneOptions.find(tz => tz.value === field.value)?.label || field.value}
                                </span>
                              </div> : "Select time zone"}
                          </SelectValue>
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {timezoneOptions.map(timezone => <SelectItem key={timezone.value} value={timezone.value}>
                            {timezone.label}
                          </SelectItem>)}
                      </SelectContent>
                    </Select> : <FormControl>
                      <Input value={timezoneOptions.find(tz => tz.value === field.value)?.label || field.value || ""} readOnly />
                    </FormControl>}
                  <FormMessage />
                 </FormItem>} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Diagnosis</CardTitle>
          
        </CardHeader>
        <CardContent>
          <FormField control={form.control} name="client_diagnosis" render={({
          field
        }) => <FormItem>
                <FormControl>
                  <DiagnosisSelector value={field.value || []} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>} />
        </CardContent>
      </Card>
    </>;
};
export default PersonalInfoTab;