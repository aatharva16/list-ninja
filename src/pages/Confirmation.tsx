
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

export default function Confirmation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-light text-gray-800">List Saved!</h2>
          <p className="text-gray-500">Your grocery list has been saved successfully.</p>
          <div className="flex justify-center gap-4 mt-6">
            <Button
              onClick={() => navigate('/')}
              variant="outline"
            >
              <ArrowLeft className="mr-2" />
              Back to List
            </Button>
            <Button
              onClick={() => navigate('/platform-selection')}
            >
              Continue
              <ArrowRight className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
