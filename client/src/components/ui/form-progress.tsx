
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Check } from 'lucide-react';

interface FormProgressProps {
  currentTab: string;
  completedTabs: string[];
}

const tabs = [
  { key: "info", label: "Personal Info" },
  { key: "experience", label: "Experience" },
  { key: "availability", label: "Availability" },
  { key: "documents", label: "Documents" },
  { key: "agreements", label: "Agreements" }
];

export function FormProgress({ currentTab, completedTabs }: FormProgressProps) {
  const currentIndex = tabs.findIndex(tab => tab.key === currentTab);
  const progress = ((currentIndex + 1) / tabs.length) * 100;

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-neutral-600">
          Step {currentIndex + 1} of {tabs.length}
        </span>
        <span className="text-sm font-medium text-neutral-600">
          {Math.round(progress)}% Complete
        </span>
      </div>
      <Progress value={progress} className="h-2 mb-4" />
      
      <div className="flex justify-between">
        {tabs.map((tab, index) => (
          <div key={tab.key} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${
              completedTabs.includes(tab.key) 
                ? 'bg-green-500 text-white' 
                : index <= currentIndex 
                  ? 'bg-primary text-white' 
                  : 'bg-neutral-200 text-neutral-400'
            }`}>
              {completedTabs.includes(tab.key) ? (
                <Check className="h-4 w-4" />
              ) : (
                index + 1
              )}
            </div>
            <span className={`text-xs text-center ${
              index <= currentIndex ? 'text-neutral-700' : 'text-neutral-400'
            }`}>
              {tab.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
