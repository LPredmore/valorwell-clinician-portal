
import { useState } from 'react';
import Layout from '../components/layout/Layout';
import PracticeTab from '@/components/settings/PracticeTab';
import CliniciansTab from '@/components/settings/CliniciansTab';
import UsersTab from '@/components/settings/UsersTab';
import BillingTab from '@/components/settings/BillingTab';
import TemplatesTab from '@/components/settings/TemplatesTab';
import SecurityTab from '@/components/settings/SecurityTab';
import LicensesTab from '@/components/settings/LicensesTab';
import { AddUserDialog } from '@/components/AddUserDialog';
import { useToast } from '@/hooks/use-toast';

const SettingsTabs = {
  PRACTICE: 'practice',
  CLINICIANS: 'clinicians',
  USERS: 'users',
  BILLING: 'billing',
  TEMPLATES: 'templates',
  SECURITY: 'security',
  LICENSES: 'licenses'
};

const Settings = () => {
  const [activeTab, setActiveTab] = useState(SettingsTabs.PRACTICE);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const handleUserAdded = () => {
    // Notify user of success
    toast({
      title: "User added",
      description: "User has been added successfully"
    });
    
    // Refresh the active tab's data (if needed)
    if (activeTab === SettingsTabs.USERS || activeTab === SettingsTabs.CLINICIANS) {
      // The refresh is handled internally in the respective component
    }
  };
  
  return (
    <Layout>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="flex border-b">
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.PRACTICE ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.PRACTICE)}
          >
            Practice
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.CLINICIANS ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.CLINICIANS)}
          >
            Clinicians
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.USERS ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.USERS)}
          >
            Users
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.BILLING ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.BILLING)}
          >
            Billing
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.TEMPLATES ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.TEMPLATES)}
          >
            Templates
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.SECURITY ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.SECURITY)}
          >
            Security
          </button>
          <button 
            className={`settings-tab ${activeTab === SettingsTabs.LICENSES ? 'active' : ''}`}
            onClick={() => setActiveTab(SettingsTabs.LICENSES)}
          >
            Licenses
          </button>
        </div>
        
        {activeTab === SettingsTabs.PRACTICE && <PracticeTab />}
        {activeTab === SettingsTabs.CLINICIANS && <CliniciansTab onAddUser={() => setIsAddUserDialogOpen(true)} />}
        {activeTab === SettingsTabs.USERS && <UsersTab onAddUser={() => setIsAddUserDialogOpen(true)} />}
        {activeTab === SettingsTabs.BILLING && <BillingTab />}
        {activeTab === SettingsTabs.TEMPLATES && <TemplatesTab />}
        {activeTab === SettingsTabs.SECURITY && <SecurityTab />}
        {activeTab === SettingsTabs.LICENSES && <LicensesTab />}
      </div>
      
      <AddUserDialog 
        open={isAddUserDialogOpen} 
        onOpenChange={setIsAddUserDialogOpen}
        onUserAdded={handleUserAdded}
      />
    </Layout>
  );
};

export default Settings;
