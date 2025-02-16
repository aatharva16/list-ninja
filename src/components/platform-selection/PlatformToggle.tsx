
import React from 'react';
import { Toggle } from '@/components/ui/toggle';

interface Platform {
  id: string;
  name: string;
  logo_url: string;
}

interface PlatformToggleProps {
  platform: Platform;
  isSelected: boolean;
  onToggle: (platformId: string) => void;
}

export function PlatformToggle({ platform, isSelected, onToggle }: PlatformToggleProps) {
  return (
    <Toggle
      pressed={isSelected}
      onPressedChange={() => onToggle(platform.id)}
      className="h-32 w-full border-2 flex flex-col items-center justify-center gap-2 data-[state=on]:border-primary"
    >
      <img
        src={platform.logo_url}
        alt={platform.name}
        className="w-16 h-16 object-contain"
      />
      <span className="text-sm font-medium">{platform.name}</span>
    </Toggle>
  );
}
