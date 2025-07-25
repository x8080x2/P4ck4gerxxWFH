
import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  return (
    <div className={cn("animate-spin rounded-full border-2 border-transparent border-t-current", sizeClasses[size], className)}>
    </div>
  );
}

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function LoadingOverlay({ isVisible, message = "Submitting your application..." }: LoadingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg p-8 flex flex-col items-center space-y-4 shadow-2xl">
        <LoadingSpinner size="lg" className="text-primary" />
        <p className="text-lg font-medium text-neutral-700">{message}</p>
        <p className="text-sm text-neutral-500">Please wait while we process your application...</p>
      </div>
    </div>
  );
}
