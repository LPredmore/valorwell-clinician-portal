
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchPracticeInfo,
  updatePracticeInfo,
  type PracticeInfo
} from '@/utils/practiceUtils';

const PracticeTab = () => {
  const [practiceInfo, setPracticeInfo] = useState<PracticeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadPracticeInfo = async () => {
      try {
        const info = await fetchPracticeInfo();
        setPracticeInfo(info);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load practice information.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPracticeInfo();
  }, [toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Practice Settings</CardTitle>
          <CardDescription>
            Manage practice information and settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Practice configuration will be implemented in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default PracticeTab;
