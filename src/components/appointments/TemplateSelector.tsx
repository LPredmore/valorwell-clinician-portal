import React, { useState, useEffect } from 'react';
import { AppointmentTemplate, TemplateCategory } from '@/types/appointmentTemplate';
import { Search, Star, Clock, Calendar, Filter } from 'lucide-react';

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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TemplateSelectorProps {
  templates: AppointmentTemplate[];
  onSelectTemplate: (template: AppointmentTemplate) => void;
  trigger?: React.ReactNode;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  templates,
  onSelectTemplate,
  trigger
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Filter templates based on search and category
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchQuery === '' || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === null || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });
  
  // Get all unique categories
  const categories = Array.from(new Set(templates.map(t => t.category)));
  
  // Get favorite templates
  const favoriteTemplates = templates.filter(t => t.is_favorite);
  
  // Handle template selection
  const handleSelectTemplate = (template: AppointmentTemplate) => {
    onSelectTemplate(template);
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            Select Template
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Appointment Template</DialogTitle>
          <DialogDescription>
            Choose a template to apply to this appointment
          </DialogDescription>
        </DialogHeader>
        
        {/* Search and filter */}
        <div className="flex items-center space-x-4 mb-4">
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
        <Tabs defaultValue={favoriteTemplates.length > 0 ? 'favorites' : 'all'} className="w-full">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="all">All Templates</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
          </TabsList>
          
          {/* All templates */}
          <TabsContent value="all">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <p>No templates found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* Favorites */}
          <TabsContent value="favorites">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-1">
                {favoriteTemplates.length > 0 ? (
                  favoriteTemplates
                    .filter(template => {
                      const matchesSearch = searchQuery === '' || 
                        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()));
                      
                      const matchesCategory = selectedCategory === null || template.category === selectedCategory;
                      
                      return matchesSearch && matchesCategory;
                    })
                    .map(template => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => handleSelectTemplate(template)}
                      />
                    ))
                ) : (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <p>No favorite templates found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          {/* By category */}
          <TabsContent value="categories">
            <ScrollArea className="h-[400px]">
              <div className="space-y-6 p-1">
                {categories
                  .filter(category => {
                    // Only show categories that have templates matching the search query
                    return templates
                      .filter(t => t.category === category)
                      .some(t => 
                        searchQuery === '' || 
                        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
                      );
                  })
                  .map(category => {
                    const categoryTemplates = templates
                      .filter(t => t.category === category)
                      .filter(t => 
                        searchQuery === '' || 
                        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
                      );
                    
                    return (
                      <div key={category} className="space-y-2">
                        <h3 className="text-lg font-medium capitalize">{category}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {categoryTemplates.map(template => (
                            <TemplateCard
                              key={template.id}
                              template={template}
                              onSelect={() => handleSelectTemplate(template)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Template card component
interface TemplateCardProps {
  template: AppointmentTemplate;
  onSelect: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect
}) => {
  return (
    <Card className="hover:border-primary cursor-pointer transition-colors" onClick={onSelect}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          {template.is_favorite && (
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          <Badge variant="outline" className="capitalize">
            {template.type.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {template.category}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        {template.description && (
          <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
        )}
        
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="h-3 w-3 mr-1" />
          <span>{template.duration} minutes</span>
        </div>
        
        {template.default_recurring_pattern && (
          <div className="flex items-center text-sm text-muted-foreground mt-1">
            <Calendar className="h-3 w-3 mr-1" />
            <span>
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
            </span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2">
        <Button className="w-full" onClick={onSelect}>
          Use Template
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TemplateSelector;