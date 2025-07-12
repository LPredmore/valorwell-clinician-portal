import React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { TabProps, insuranceTypeOptions, relationshipOptions } from "@/types/client";
const InsuranceTab: React.FC<TabProps> = ({
  isEditing,
  form,
  clientData
}) => {
  return <>
      {clientData?.client_insurance_company_primary && (
        <Card>
          <CardHeader>
            <CardTitle>Primary Insurance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="client_insurance_company_primary" render={({
              field
            }) => <FormItem>
                    <FormLabel>Insurance Company</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>} />
              <FormField control={form.control} name="client_insurance_type_primary" render={({
              field
            }) => (
                  <FormItem>
                    <FormLabel>Insurance Type</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
          </CardContent>
        </Card>
      )}

      {clientData?.client_vacoverage && <Card className="mt-4">
          <CardHeader>
            <CardTitle>VA Insurance</CardTitle>
          </CardHeader>
          <CardContent>
            {clientData.client_vacoverage === "CHAMPVA" && <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="client_champva" render={({
            field
          }) => <FormItem>
                      <FormLabel>CHAMPVA</FormLabel>
                      <FormControl>
                        
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                <div className="col-span-2">
                  
                </div>
              </div>}

            {clientData.client_vacoverage === "TRICARE" && <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="client_tricare_beneficiary_category" render={({
            field
          }) => <FormItem>
                      <FormLabel>TRICARE Beneficiary Category</FormLabel>
                      <Select disabled={!isEditing} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Active Duty Service Member", "Active Duty Family Member", "Retired Service Member", "Retired Family Member", "Guard/Reserve Service Member", "Guard/Reserve Family Member", "Surviving Family Member", "Medal of Honor Recipient", "TRICARE For Life", "TRICARE Young Adult", "Former Spouse", "Children with Disabilities"].map(category => <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="client_tricare_sponsor_name" render={({
            field
          }) => <FormItem>
                      <FormLabel>TRICARE Sponsor's Name</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="client_tricare_sponsor_branch" render={({
            field
          }) => <FormItem>
                      <FormLabel>TRICARE Sponsor's Branch of Service</FormLabel>
                      <Select disabled={!isEditing} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Air Force", "Army", "Coast Guard", "Marine Corps", "Navy", "NOAA Corps", "Space Force", "USPHS"].map(branch => <SelectItem key={branch} value={branch}>
                              {branch}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="client_tricare_sponsor_id" render={({
            field
          }) => <FormItem>
                      <FormLabel>TRICARE Sponsor's SSN or DOD ID Number</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="client_tricare_plan" render={({
            field
          }) => <FormItem>
                      <FormLabel>TRICARE Plan</FormLabel>
                      <Select disabled={!isEditing} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select plan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["TRICARE Prime", "TRICARE Prime Remote", "TRICARE Prime Option", "TRICARE Prime Overseas", "TRICARE Remote Overseas", "TRICARE Select", "TRICARE Select Overseas", "TRICARE For Life", "TRICARE Reserve Select", "TRICARE Retired Reserve", "TRICARE Young Adult"].map(plan => <SelectItem key={plan} value={plan}>
                              {plan}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="client_tricare_region" render={({
            field
          }) => <FormItem>
                      <FormLabel>TRICARE Region</FormLabel>
                      <Select disabled={!isEditing} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["TRICARE East", "TRICARE West", "TRICARE Overseas"].map(region => <SelectItem key={region} value={region}>
                              {region}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="client_tricare_policy_id" render={({
            field
          }) => <FormItem>
                      <FormLabel>Policy #/Plan ID</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
                
                <FormField control={form.control} name="client_tricare_has_referral" render={({
            field
          }) => <FormItem>
                      <FormLabel>Do you have a Referral Number?</FormLabel>
                      <Select disabled={!isEditing} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Yes", "No"].map(option => <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
                
                {clientData.client_tricare_has_referral === "Yes" && <FormField control={form.control} name="client_tricare_referral_number" render={({
            field
          }) => <FormItem>
                        <FormLabel>Referral Number</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly={!isEditing} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />}
              </div>}
            
            {clientData.client_vacoverage === "VA Community Care" && <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="mentalHealthReferral" render={({
            field
          }) => <FormItem>
                      <FormLabel>Have you requested a referral from Mental Health?</FormLabel>
                      <Select disabled={!isEditing} onValueChange={field.onChange} defaultValue={field.value || ""} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["Yes", "No"].map(option => <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>} />
              </div>}
          </CardContent>
        </Card>}
    </>;
};
export default InsuranceTab;