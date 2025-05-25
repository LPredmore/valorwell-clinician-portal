import React, { useState, useEffect } from 'react';
import { AppointmentTemplate, TemplateType, TemplateCategory } from '@/types/appointmentTemplate';
import { RecurringPattern } from '@/types/appointment';
import { Plus, Edit, Trash, Star, StarOff, Search, Filter } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { RecurringPatternEditor } from './RecurringPatternEditor';

export interface TemplateManagerProps {
  templates: AppointmentTemplate[];
  onCreateTemplate: (template: Omit<AppointmentTemplate, 'id'>) => void;
  onUpdateTemplate: (template: AppointmentTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onToggleFavorite: (templateId: string) => void;
  clinicianId: string;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
  onToggleFavorite,
  clinicianId
}) => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AppointmentTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showRecurringEditor, setShowRecurringEditor] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState<RecurringPattern | null>(null);
  
  // Form setup for create/edit
  const form = useForm<Omit<AppointmentTemplate, 'id'>>({
    defaultValues: {
      name: '',
      description: '',
      type: TemplateType.THERAPY_SESSION,
      duration: 60,
      notes: '',
      category: TemplateCategory.STANDARD,
      is_favorite: false,
      clinician_id: clinicianId,
      is_default: false
    }
  });
  
  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isCreateDialogOpen) {
      form.reset({
        name: '',
        description: '',
        type: TemplateType.THERAPY_SESSION,
        duration: 60,
        notes: '',
        category: TemplateCategory.STANDARD,
        is_favorite: false,
        clinician_id: clinicianId,
        is_default: false
      });
      setRecurringPattern(null);
      setShowRecurringEditor(false);
    }
  }, [isCreateDialogOpen, form, clinicianId]);
  
  // Set form values when editing
  useEffect(() => {
    if (isEditDialogOpen && selectedTemplate) {
      form.reset({
        name: selectedTemplate.name,
        description: selectedTemplate.description || '',
        type: selectedTemplate.type,
        duration: selectedTemplate.duration,
        notes: selectedTemplate.notes || '',
        category: selectedTemplate.category,
        is_favorite: selectedTemplate.is_favorite,
        clinician_id: selectedTemplate.clinician_id,
        is_default: selectedTemplate.is_default || false,
        default_location: selectedTemplate.default_location,
        default_video_enabled: selectedTemplate.default_video_enabled,
        default_reminder_minutes: selectedTemplate.default_reminder_minutes,
        default_billing_code: selectedTemplate.default_billing_code,
        default_diagnosis_codes: selectedTemplate.default_diagnosis_codes
      });
      
      // Set recurring pattern if it exists
      if (selectedTemplate.default_recurring_pattern) {
        const pattern: RecurringPattern = {
          frequency: selectedTemplate.default_recurring_pattern.frequency || 'weekly',
          interval: selectedTemplate.default_recurring_pattern.interval || 1,
          daysOfWeek: selectedTemplate.default_recurring_pattern.daysOfWeek
        };
        setRecurringPattern(pattern);
        setShowRecurringEditor(true);
      } else {
        setRecurringPattern(null);
        setShowRecurringEditor(false);
      }
    }
  }, [isEditDialogOpen, selectedTemplate, form]);
  
  // Handle form submission for create
  const handleCreateSubmit = (values: Omit<AppointmentTemplate, 'id'>) => {
    // Add recurring pattern if enabled
    if (showRecurringEditor && recurringPattern) {
      values.default_recurring_pattern = {
        frequency: recurringPattern.frequency,
        interval: recurringPattern.interval,
        daysOfWeek: recurringPattern.daysOfWeek
      };
    }
    
    onCreateTemplate(values);
    setIsCreateDialogOpen(false);
  };
  
  // Handle form submission for edit
  const handleEditSubmit = (values: Omit<AppointmentTemplate, 'id'>) => {
    if (!selectedTemplate) return;
    
    // Add recurring pattern if enabled
    if (showRecurringEditor && recurringPattern) {
      values.default_recurring_pattern = {
        frequency: recurringPattern.frequency,
        interval: recurringPattern.interval,
        daysOfWeek: recurringPattern.daysOfWeek
      };
    } else {
      values.default_recurring_pattern = undefined;
    }
    
    onUpdateTemplate({
      ...values,
      id: selectedTemplate.id,
      created_at: selectedTemplate.created_at,
      updated_at: new Date().toISOString()
    });
    
    setIsEditDialogOpen(false);
  };
  
  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    if (selectedTemplate) {
      onDeleteTemplate(selectedTemplate.id);
      setIsDeleteDialogOpen(false);
    }
  };
  
  // Handle favorite toggle
  const handleToggleFavorite = (template: AppointmentTemplate) => {
    onToggleFavorite(template.id);
  };
  
  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === null || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Group templates by category
  const templatesByCategory = filteredTemplates.reduce((acc, template) => {
    const category = template.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(template);
    return acc;
  }, {} as Record<string, AppointmentTemplate[]>);
  
  // Get all unique categories
  const categories = Array.from(new Set(templates.map(t => t.category)));
  
  // Template type options
  const templateTypes = Object.values(TemplateType).map(type => ({
    value: type,
    label: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }));
  
  // Template category options
  const templateCategories = Object.values(TemplateCategory).map(category => ({
    value: category,
    label: category.charAt(0).toUpperCase() + category.slice(1)
  }));
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Appointment Templates</h2>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Appointment Template</DialogTitle>
              <DialogDescription>
                Create a reusable template for scheduling appointments
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter template name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter template description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Appointment Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templateTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={15}
                            step={15}
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {templateCategories.map(category => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="is_favorite"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-end space-x-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Mark as Favorite</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter default notes for this template" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="recurring-pattern"
                      checked={showRecurringEditor}
                      onCheckedChange={(checked) => setShowRecurringEditor(checked === true)}
                    />
                    <Label htmlFor="recurring-pattern">Include Default Recurring Pattern</Label>
                  </div>
                  
                  {showRecurringEditor && (
                    <div className="border rounded-md p-4 mt-2">
                      <RecurringPatternEditor
                        initialPattern={recurringPattern || undefined}
                        onChange={setRecurringPattern}
                      />
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Template</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Search and filter */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select
          value={selectedCategory || ''}
          onValueChange={(value) => setSelectedCategory(value === '' ? null : value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Templates list */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="all">All Templates</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>
        
        {/* All templates */}
        <TabsContent value="all">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.length > 0 ? (
              filteredTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onEdit={() => {
                    setSelectedTemplate(template);
                    setIsEditDialogOpen(true);
                  }}
                  onDelete={() => {
                    setSelectedTemplate(template);
                    setIsDeleteDialogOpen(true);
                  }}
                  onToggleFavorite={() => handleToggleFavorite(template)}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <p>No templates found</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Favorites */}
        <TabsContent value="favorites">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.filter(t => t.is_favorite).length > 0 ? (
              filteredTemplates
                .filter(t => t.is_favorite)
                .map(template => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => {
                      setSelectedTemplate(template);
                      setIsEditDialogOpen(true);
                    }}
                    onDelete={() => {
                      setSelectedTemplate(template);
                      setIsDeleteDialogOpen(true);
                    }}
                    onToggleFavorite={() => handleToggleFavorite(template)}
                  />
                ))
            ) : (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <p>No favorite templates found</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* By category */}
        <TabsContent value="categories">
          <div className="space-y-6">
            {Object.keys(templatesByCategory).length > 0 ? (
              Object.entries(templatesByCategory).map(([category, templates]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-lg font-medium capitalize">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onEdit={() => {
                          setSelectedTemplate(template);
                          setIsEditDialogOpen(true);
                        }}
                        onDelete={() => {
                          setSelectedTemplate(template);
                          setIsDeleteDialogOpen(true);
                        }}
                        onToggleFavorite={() => handleToggleFavorite(template)}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No templates found</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Edit dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Appointment Template</DialogTitle>
            <DialogDescription>
              Update the template details
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter template name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter template description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Appointment Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templateTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={15}
                          step={15}
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templateCategories.map(category => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="is_favorite"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-end space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Mark as Favorite</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter default notes for this template" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-recurring-pattern"
                    checked={showRecurringEditor}
                    onCheckedChange={(checked) => setShowRecurringEditor(checked === true)}
                  />
                  <Label htmlFor="edit-recurring-pattern">Include Default Recurring Pattern</Label>
                </div>
                
                {showRecurringEditor && (
                  <div className="border rounded-md p-4 mt-2">
                    <RecurringPatternEditor
                      initialPattern={recurringPattern || undefined}
                      onChange={setRecurringPattern}
                    />
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Template</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this template? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Template card component
interface TemplateCardProps {
  template: AppointmentTemplate;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onEdit,
  onDelete,
  onToggleFavorite
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onToggleFavorite}>
            {template.is_favorite ? (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          <Badge variant="outline" className="capitalize">
            {template.type.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {template.category}
          </Badge>
          <Badge>{template.duration} min</Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {template.description && (
          <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
        )}
        
        {template.default_recurring_pattern && (
          <div className="text-xs text-muted-foreground mt-2">
            <span className="font-medium">Recurring: </span>
            {template.default_recurring_pattern.frequency === 'weekly' && 
              `Every ${template.default_recurring_pattern.interval > 1 ? template.default_recurring_pattern.interval : ''} week${template.default_recurring_pattern.interval > 1 ? 's' : ''}`}
            {template.default_recurring_pattern.daysOfWeek && template.default_recurring_pattern.daysOfWeek.length > 0 && (
              <span>
                {' on '}
                {template.default_recurring_pattern.daysOfWeek.map(day => 
                  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
                ).join(', ')}
              </span>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <div className="flex justify-end space-x-2 w-full">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash className="h-3 w-3 mr-1" />
            Delete
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default TemplateManager;