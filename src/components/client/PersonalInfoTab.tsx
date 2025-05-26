import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { genders, genderIdentities } from '@/data/gender-data';
import { states } from '@/data/state-data';
import { TabProps } from '@/types/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Checkbox } from "@/components/ui/checkbox"

const formSchema = z.object({
  client_first_name: z.string().min(2, {
    message: "First name must be at least 2 characters.",
  }),
  client_last_name: z.string().min(2, {
    message: "Last name must be at least 2 characters.",
  }),
  client_preferred_name: z.string().optional(),
  client_email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  client_phone: z.string().min(10, {
    message: "Phone number must be at least 10 digits.",
  }),
  client_date_of_birth: z.string().optional(),
  client_gender: z.string().optional(),
  client_gender_identity: z.string().optional(),
  client_address: z.string().optional(),
  client_city: z.string().optional(),
  client_state: z.string().optional(),
  client_zipcode: z.string().optional(),
  client_self_goal: z.string().optional(),
  client_minor: z.boolean().default(false).optional(),
  client_is_profile_complete: z.boolean().default(false).optional(),
  client_assigned_therapist: z.string().optional(),
  client_diagnosis: z.array(z.string()).optional(),
});

const PersonalInfoTab: React.FC<TabProps> = ({ clientData, isEditing, onSave, onCancel, form }) => {
  const [newDiagnosis, setNewDiagnosis] = React.useState('');

  const formMethods = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      client_first_name: clientData?.client_first_name || '',
      client_last_name: clientData?.client_last_name || '',
      client_preferred_name: clientData?.client_preferred_name || '',
      client_email: clientData?.client_email || '',
      client_phone: clientData?.client_phone || '',
      client_date_of_birth: clientData?.client_date_of_birth || '',
      client_gender: clientData?.client_gender || '',
      client_gender_identity: clientData?.client_gender_identity || '',
      client_address: clientData?.client_address || '',
      client_city: clientData?.client_city || '',
      client_state: clientData?.client_state || '',
      client_zipcode: clientData?.client_zipcode || '',
      client_self_goal: clientData?.client_self_goal || '',
      client_minor: clientData?.client_minor || false,
      client_is_profile_complete: clientData?.client_is_profile_complete || false,
      client_assigned_therapist: clientData?.client_assigned_therapist || '',
      client_diagnosis: clientData?.client_diagnosis || [],
    },
  });

  const { register, handleSubmit, formState: { errors } } = formMethods;

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_first_name">First Name</Label>
          <Input
            id="client_first_name"
            disabled={!isEditing}
            defaultValue={clientData?.client_first_name}
            {...register("client_first_name")}
            className={errors.client_first_name ? "border-red-500" : ""}
          />
          {errors.client_first_name && (
            <p className="text-red-500 text-sm">{errors.client_first_name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="client_last_name">Last Name</Label>
          <Input
            id="client_last_name"
            disabled={!isEditing}
            defaultValue={clientData?.client_last_name}
            {...register("client_last_name")}
            className={errors.client_last_name ? "border-red-500" : ""}
          />
          {errors.client_last_name && (
            <p className="text-red-500 text-sm">{errors.client_last_name.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_preferred_name">Preferred Name</Label>
          <Input
            id="client_preferred_name"
            disabled={!isEditing}
            defaultValue={clientData?.client_preferred_name}
            {...register("client_preferred_name")}
          />
        </div>
        <div>
          <Label htmlFor="client_email">Email</Label>
          <Input
            id="client_email"
            type="email"
            disabled={!isEditing}
            defaultValue={clientData?.client_email}
            {...register("client_email")}
            className={errors.client_email ? "border-red-500" : ""}
          />
          {errors.client_email && (
            <p className="text-red-500 text-sm">{errors.client_email.message}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_phone">Phone</Label>
          <Input
            id="client_phone"
            disabled={!isEditing}
            defaultValue={clientData?.client_phone}
            {...register("client_phone")}
            className={errors.client_phone ? "border-red-500" : ""}
          />
          {errors.client_phone && (
            <p className="text-red-500 text-sm">{errors.client_phone.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="client_date_of_birth">Date of Birth</Label>
          <Input
            id="client_date_of_birth"
            type="date"
            disabled={!isEditing}
            defaultValue={clientData?.client_date_of_birth}
            {...register("client_date_of_birth")}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_gender">Gender</Label>
          <Select disabled={!isEditing}>
            <SelectTrigger id="client_gender">
              <SelectValue placeholder={clientData?.client_gender || "Select a gender"} />
            </SelectTrigger>
            <SelectContent>
              {genders.map((gender) => (
                <SelectItem key={gender} value={gender}>
                  {gender}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="client_gender_identity">Gender Identity</Label>
          <Select disabled={!isEditing}>
            <SelectTrigger id="client_gender_identity">
              <SelectValue placeholder={clientData?.client_gender_identity || "Select a gender identity"} />
            </SelectTrigger>
            <SelectContent>
              {genderIdentities.map((genderIdentity) => (
                <SelectItem key={genderIdentity} value={genderIdentity}>
                  {genderIdentity}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_address">Address</Label>
          <Input
            id="client_address"
            disabled={!isEditing}
            defaultValue={clientData?.client_address}
            {...register("client_address")}
          />
        </div>
        <div>
          <Label htmlFor="client_city">City</Label>
          <Input
            id="client_city"
            disabled={!isEditing}
            defaultValue={clientData?.client_city}
            {...register("client_city")}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="client_state">State</Label>
          <Select disabled={!isEditing}>
            <SelectTrigger id="client_state">
              <SelectValue placeholder={clientData?.client_state || "Select a state"} />
            </SelectTrigger>
            <SelectContent>
              {states.map((state) => (
                <SelectItem key={state.value} value={state.value}>
                  {state.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="client_zipcode">Zip Code</Label>
          <Input
            id="client_zipcode"
            disabled={!isEditing}
            defaultValue={clientData?.client_zipcode}
            {...register("client_zipcode")}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="client_self_goal">Self Goal</Label>
        <Textarea
          id="client_self_goal"
          disabled={!isEditing}
          defaultValue={clientData?.client_self_goal}
          {...register("client_self_goal")}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox
          id="client_minor"
          disabled={!isEditing}
          defaultChecked={clientData?.client_minor}
          onCheckedChange={(checked) => {
            if (isEditing) {
              onSave({ client_minor: checked });
            }
          }}
          {...register("client_minor")}
        />
        <Label htmlFor="client_minor">Is Minor</Label>
      </div>
      <div>
        <Label htmlFor="client_assigned_therapist">Assigned Therapist</Label>
        <Input
          id="client_assigned_therapist"
          disabled={!isEditing}
          defaultValue={clientData?.client_assigned_therapist}
          {...register("client_assigned_therapist")}
        />
      </div>
      <div>
        <Label>Diagnosis</Label>
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            placeholder="Add new diagnosis"
            value={newDiagnosis}
            onChange={(e) => setNewDiagnosis(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newDiagnosis.trim()) {
                if (form?.handleAddDiagnosis) {
                  form.handleAddDiagnosis(newDiagnosis);
                  setNewDiagnosis('');
                }
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if (form?.handleAddDiagnosis) {
                form.handleAddDiagnosis(newDiagnosis);
                setNewDiagnosis('');
              }
            }}
            disabled={!newDiagnosis.trim()}
          >
            Add Diagnosis
          </Button>
        </div>
        {clientData?.client_diagnosis && clientData.client_diagnosis.length > 0 && (
          <ul className="mt-2 space-y-1">
            {clientData.client_diagnosis.map((diagnosis, index) => (
              <li key={index} className="flex items-center justify-between">
                {diagnosis}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (form?.handleRemoveDiagnosis) {
                      form.handleRemoveDiagnosis(index);
                    }
                  }}
                  disabled={!isEditing}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {isEditing ? (
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      ) : null}
    </form>
  );
};

export default PersonalInfoTab;
