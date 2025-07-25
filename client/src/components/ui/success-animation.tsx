import React from 'react';
import { Check } from 'lucide-react';

interface LoadingOverlayProps {
  isVisible: boolean;
}

interface SuccessAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export function LoadingOverlay({ isVisible }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-lg font-medium text-neutral-800">Submitting your application...</p>
        <p className="text-sm text-neutral-600">Please wait while we process your information</p>
      </div>
    </div>
  );
}

export function SuccessAnimation({ isVisible, onComplete }: SuccessAnimationProps) {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onComplete();
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4 animate-bounce-in">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-neutral-800">Application Submitted!</h3>
        <p className="text-neutral-600 text-center">
          Thank you for your application. We'll review it and get back to you soon.
        </p>
      </div>
    </div>
  );
}