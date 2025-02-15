
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function Confirmation() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-light text-gray-800">List Saved!</h2>
          <p className="text-gray-500">Your grocery list has been saved successfully.</p>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="mr-2" />
            Back to List
          </Button>
        </div>
      </div>
    </div>
  );
}
