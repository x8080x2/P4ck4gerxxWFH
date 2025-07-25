
import React, { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuccessAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function SuccessAnimation({ isVisible, onComplete }: SuccessAnimationProps) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (isVisible) {
      const timer1 = setTimeout(() => setStage(1), 100);
      const timer2 = setTimeout(() => setStage(2), 600);
      const timer3 = setTimeout(() => setStage(3), 1100);
      const timer4 = setTimeout(() => {
        onComplete?.();
      }, 2000);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
        clearTimeout(timer4);
      };
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-12 flex flex-col items-center space-y-6 shadow-2xl max-w-md mx-4">
        {/* Animated Check Circle */}
        <div className={cn(
          "relative w-24 h-24 rounded-full bg-green-500 flex items-center justify-center transition-all duration-500",
          stage >= 1 ? "scale-100 opacity-100" : "scale-0 opacity-0"
        )}>
          <Check className={cn(
            "h-12 w-12 text-white transition-all duration-300 delay-200",
            stage >= 1 ? "scale-100 opacity-100" : "scale-0 opacity-0"
          )} />
          
          {/* Sparkle animations */}
          {stage >= 2 && (
            <>
              <Sparkles className="absolute -top-2 -right-2 h-6 w-6 text-yellow-400 animate-pulse" />
              <Sparkles className="absolute -bottom-2 -left-2 h-4 w-4 text-yellow-400 animate-pulse delay-100" />
              <Sparkles className="absolute top-0 -left-4 h-5 w-5 text-yellow-400 animate-pulse delay-200" />
            </>
          )}
        </div>

        {/* Success Message */}
        <div className={cn(
          "text-center transition-all duration-500 delay-300",
          stage >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}>
          <h3 className="text-2xl font-bold text-neutral-800 mb-2">Success!</h3>
          <p className="text-neutral-600">Your application has been submitted successfully.</p>
        </div>

        {/* Progress dots */}
        <div className={cn(
          "flex space-x-2 transition-all duration-500 delay-500",
          stage >= 3 ? "opacity-100" : "opacity-0"
        )}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full bg-primary animate-pulse",
                `delay-[${i * 100}ms]`
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
