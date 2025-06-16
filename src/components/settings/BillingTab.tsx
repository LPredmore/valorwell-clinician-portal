
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  fetchCPTCodes,
  addCPTCode,
  updateCPTCode,
  deleteCPTCode,
  type CPTCode
} from '@/utils/cptCodeUtils';

const BillingTab = () => {
  const [cptCodes, setCptCodes] = useState<CPTCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadCPTCodes = async () => {
      try {
        const codes = await fetchCPTCodes();
        setCptCodes(codes);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load CPT codes.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCPTCodes();
  }, [toast]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing Settings</CardTitle>
          <CardDescription>
            Manage CPT codes and billing preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Billing configuration will be implemented in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingTab;
