
import { useState } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Lock, Shield, Key } from 'lucide-react';

export default function AglAccess() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDevelopment, setIsDevelopment] = useState(true); // Set to true for development

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/validate-agl-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const result = await response.json();

      if (result.success) {
        // Store access token and timestamp in sessionStorage
        sessionStorage.setItem('agl_access', 'granted');
        sessionStorage.setItem('agl_access_time', Date.now().toString());
        setLocation('/agl');
      } else {
        setError(result.message || 'Invalid access code');
      }
    } catch (error) {
      setError('Failed to validate code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTestCode = async () => {
    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/debug/generate-test-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setCode(result.code);
        setError('');
      } else {
        setError('Failed to generate test code');
      }
    } catch (error) {
      setError('Failed to generate test code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-neutral-800">
            Agreement Letter Access
          </CardTitle>
          <p className="text-neutral-600 text-sm">
            {isDevelopment 
              ? "Enter access code or generate a test code for development"
              : "Enter the access code provided by MM Packaging Admin"
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code" className="text-sm font-medium">
                Access Code
              </Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^A-Z0-9]/g, '').toUpperCase();
                  setCode(value);
                }}
                placeholder="Enter 8-character code"
                maxLength={8}
                className="mt-1 text-center text-lg font-mono tracking-wider"
                disabled={isLoading}
                required
                autoComplete="off"
                spellCheck="false"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {isDevelopment && (
              <Button
                type="button"
                variant="outline"
                className="w-full mb-2"
                onClick={generateTestCode}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    Generating...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Generate Test Code
                  </div>
                )}
              </Button>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || code.length !== 8}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Validating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Access Agreement Letter
                </div>
              )}
            </Button>
          </form>

         
        </CardContent>
      </Card>
    </div>
  );
}
