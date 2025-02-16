
import React from 'react';
import { Input } from '@/components/ui/input';

interface PincodeInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function PincodeInput({ value, onChange }: PincodeInputProps) {
  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Enter Pincode
      </label>
      <Input
        type="text"
        placeholder="Enter 6-digit pincode"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={6}
        className="max-w-[200px]"
      />
    </div>
  );
}
