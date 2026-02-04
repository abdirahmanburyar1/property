import { useState } from 'react';
import {
  MapPinIcon,
  BuildingOfficeIcon,
  BanknotesIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import Regions from '../components/settings/Regions';
import Cities from '../components/settings/Cities';
import Commission from '../components/settings/Commission';
import RevenueSplit from '../components/settings/RevenueSplit';

type SettingsTab = 'regions' | 'cities' | 'commission' | 'revenuesplit';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('regions');

  const tabs = [
    { id: 'regions' as SettingsTab, name: 'Regions', icon: MapPinIcon },
    { id: 'cities' as SettingsTab, name: 'Cities', icon: BuildingOfficeIcon },
    { id: 'commission' as SettingsTab, name: 'Collector Commission', icon: BanknotesIcon },
    { id: 'revenuesplit' as SettingsTab, name: 'Revenue split', icon: ScaleIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage system settings and configurations
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'regions' && <Regions />}
        {activeTab === 'cities' && <Cities />}
        {activeTab === 'commission' && <Commission />}
        {activeTab === 'revenuesplit' && <RevenueSplit />}
      </div>
    </div>
  );
}
