import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Toggle } from '@/components/ui/toggle';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Platform {
  id: string;
  name: string;
  logo_url: string;
}

export default function PlatformSelection() {
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [pincode, setPincode] = useState('');
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    fetchPlatforms();
  }, []);

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

  const validatePincode = (pincode: string) => {
    const pincodeRegex = /^[1-9][0-9]{5}$/;
    return pincodeRegex.test(pincode);
  };

  const handleComparePrices = async () => {
    if (!validatePincode(pincode)) {
      toast.error('Please enter a valid 6-digit Indian pincode');
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform');
      return;
    }

    try {
      setScraping(true);
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('No user found');

      // Save user platform selections
      const { error: selectionError } = await supabase
        .from('user_platform_selections')
        .insert({
          user_id: user.data.user.id,
          pincode,
          platform_ids: selectedPlatforms
        });

      if (selectionError) throw selectionError;

      // Fetch grocery items for the user
      const { data: groceryItems, error: groceryError } = await supabase
        .from('grocery_items')
        .select('name')
        .eq('user_id', user.data.user.id);

      if (groceryError) throw groceryError;

      if (!groceryItems || groceryItems.length === 0) {
        toast.error('No grocery items found. Please add items to your list first.');
        return;
      }

      // Clear previous scraped results
      const { error: deleteError } = await supabase
        .from('scraped_results')
        .delete()
        .eq('user_id', user.data.user.id);

      if (deleteError) throw deleteError;

      // Start scraping for each platform
      for (const platformId of selectedPlatforms) {
        const platform = platforms.find(p => p.id === platformId);
        if (!platform) continue;

        if (platform.name.toLowerCase().includes('blinkit')) {
          toast.info(`Scraping prices from ${platform.name}...`);
          
          const { data: scrapedData, error: scrapeError } = await supabase.functions.invoke(
            'scrape-blinkit',
            {
              body: {
                pincode,
                groceryItems: groceryItems.map(item => item.name),
                platformId
              }
            }
          );

          if (scrapeError) {
            toast.error(`Error scraping from ${platform.name}: ${scrapeError.message}`);
            continue;
          }

          if (scrapedData?.success) {
            toast.success(`Successfully scraped prices from ${platform.name}`);
          }
        }
      }

      // Navigate to comparison results page
      navigate('/comparison-results');
    } catch (error: any) {
      toast.error('Error comparing prices: ' + error.message);
    } finally {
      setScraping(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto p-6">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto p-6 space-y-8 animate-fade-in">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="mr-2" />
            Back to List
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-light text-gray-800 mb-2">Quick Commerce Platform Selection</h2>
            <p className="text-gray-500">Choose platforms to compare prices and enter your location</p>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Enter Pincode
            </label>
            <Input
              type="text"
              placeholder="Enter 6-digit pincode"
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              maxLength={6}
              className="max-w-[200px]"
            />
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Select Platforms (Max 4)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {platforms.map((platform) => (
                <Toggle
                  key={platform.id}
                  pressed={selectedPlatforms.includes(platform.id)}
                  onPressedChange={() => togglePlatform(platform.id)}
                  className="h-32 w-full border-2 flex flex-col items-center justify-center gap-2 data-[state=on]:border-primary"
                >
                  <img
                    src={platform.logo_url}
                    alt={platform.name}
                    className="w-16 h-16 object-contain"
                  />
                  <span className="text-sm font-medium">{platform.name}</span>
                </Toggle>
              ))}
            </div>
          </div>

          <Button
            onClick={handleComparePrices}
            className="mt-8"
            size="lg"
            disabled={scraping}
          >
            {scraping ? 'Comparing Prices...' : 'Compare Prices'}
          </Button>
        </div>
      </div>
    </div>
  );
}
