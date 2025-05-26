import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { insuranceTypeOptions, TabProps } from '@/types/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const InsuranceTab: React.FC<TabProps> = ({ clientData, isEditing, onSave }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Insurance Information</CardTitle>
        <CardDescription>
          Enter the client's insurance details.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Insurance */}
          <div>
            <Label htmlFor="insurance_company_primary">Primary Insurance Company</Label>
            <Input
              id="insurance_company_primary"
              value={clientData?.client_insurance_company_primary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_insurance_company_primary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="policy_number_primary">Primary Policy Number</Label>
            <Input
              id="policy_number_primary"
              value={clientData?.client_policy_number_primary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_policy_number_primary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="group_number_primary">Primary Group Number</Label>
            <Input
              id="group_number_primary"
              value={clientData?.client_group_number_primary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_group_number_primary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="subscriber_name_primary">Primary Subscriber Name</Label>
            <Input
              id="subscriber_name_primary"
              value={clientData?.client_subscriber_name_primary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_subscriber_name_primary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="insurance_type_primary">Primary Insurance Type</Label>
            <Select
              onValueChange={(value) => {
                if (isEditing) {
                  onSave({ client_insurance_type_primary: value });
                }
              }}
              defaultValue={clientData?.client_insurance_type_primary || ''}
              disabled={!isEditing}
            >
              <SelectTrigger id="insurance_type_primary">
                <SelectValue placeholder="Select insurance type" />
              </SelectTrigger>
              <SelectContent>
                {insuranceTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subscriber_dob_primary">Primary Subscriber Date of Birth</Label>
            <Input
              type="date"
              id="subscriber_dob_primary"
              value={clientData?.client_subscriber_dob_primary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_subscriber_dob_primary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Secondary Insurance */}
          <div>
            <Label htmlFor="insurance_company_secondary">Secondary Insurance Company</Label>
            <Input
              id="insurance_company_secondary"
              value={clientData?.client_insurance_company_secondary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_insurance_company_secondary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="policy_number_secondary">Secondary Policy Number</Label>
            <Input
              id="policy_number_secondary"
              value={clientData?.client_policy_number_secondary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_policy_number_secondary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="group_number_secondary">Secondary Group Number</Label>
            <Input
              id="group_number_secondary"
              value={clientData?.client_group_number_secondary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_group_number_secondary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="subscriber_name_secondary">Secondary Subscriber Name</Label>
            <Input
              id="subscriber_name_secondary"
              value={clientData?.client_subscriber_name_secondary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_subscriber_name_secondary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="insurance_type_secondary">Secondary Insurance Type</Label>
            <Select
              onValueChange={(value) => {
                if (isEditing) {
                  onSave({ client_insurance_type_secondary: value });
                }
              }}
              defaultValue={clientData?.client_insurance_type_secondary || ''}
              disabled={!isEditing}
            >
              <SelectTrigger id="insurance_type_secondary">
                <SelectValue placeholder="Select insurance type" />
              </SelectTrigger>
              <SelectContent>
                {insuranceTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subscriber_dob_secondary">Secondary Subscriber Date of Birth</Label>
            <Input
              type="date"
              id="subscriber_dob_secondary"
              value={clientData?.client_subscriber_dob_secondary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_subscriber_dob_secondary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tertiary Insurance */}
          <div>
            <Label htmlFor="insurance_company_tertiary">Tertiary Insurance Company</Label>
            <Input
              id="insurance_company_tertiary"
              value={clientData?.client_insurance_company_tertiary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_insurance_company_tertiary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="policy_number_tertiary">Tertiary Policy Number</Label>
            <Input
              id="policy_number_tertiary"
              value={clientData?.client_policy_number_tertiary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_policy_number_tertiary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="group_number_tertiary">Tertiary Group Number</Label>
            <Input
              id="group_number_tertiary"
              value={clientData?.client_group_number_tertiary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_group_number_tertiary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="subscriber_name_tertiary">Tertiary Subscriber Name</Label>
            <Input
              id="subscriber_name_tertiary"
              value={clientData?.client_subscriber_name_tertiary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_subscriber_name_tertiary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="insurance_type_tertiary">Tertiary Insurance Type</Label>
            <Select
              onValueChange={(value) => {
                if (isEditing) {
                  onSave({ client_insurance_type_tertiary: value });
                }
              }}
              defaultValue={clientData?.client_insurance_type_tertiary || ''}
              disabled={!isEditing}
            >
              <SelectTrigger id="insurance_type_tertiary">
                <SelectValue placeholder="Select insurance type" />
              </SelectTrigger>
              <SelectContent>
                {insuranceTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subscriber_dob_tertiary">Tertiary Subscriber Date of Birth</Label>
            <Input
              type="date"
              id="subscriber_dob_tertiary"
              value={clientData?.client_subscriber_dob_tertiary || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_subscriber_dob_tertiary: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Government Insurance */}
          <div>
            <Label htmlFor="vacoverage">VA Coverage</Label>
            <Input
              id="vacoverage"
              value={clientData?.client_vacoverage || ''}
              onChange={(e) => {
                if (isEditing) {
                  onSave({ client_vacoverage: e.target.value });
                }
              }}
              disabled={!isEditing}
            />
          </div>
          <div>
            <Label htmlFor="tricare_has_referral">Tricare Referral Required</Label>
            <Checkbox
              id="tricare_has_referral"
              checked={Boolean(clientData?.client_tricare_has_referral)}
              onCheckedChange={(checked) => {
                if (isEditing) {
                  onSave({ client_tricare_has_referral: Boolean(checked) });
                }
              }}
              disabled={!isEditing}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InsuranceTab;
