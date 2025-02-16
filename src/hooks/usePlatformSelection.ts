
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Platform {
  id: string;
  name: string;
  logo_url: string;
}

export function usePlatformSelection() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platforms')
        .select('*');
      
      if (error) throw error;
      setPlatforms(data || []);
    } catch (error: any) {
      toast.error('Error loading platforms: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(id => id !== platformId);
      }
      if (prev.length >= 4) {
        toast.error('You can select up to 4 platforms');
        return prev;
      }
      return [...prev, platformId];
    });
  };

  return {
    platforms,
    selectedPlatforms,
    loading,
    fetchPlatforms,
    togglePlatform
  };
}
