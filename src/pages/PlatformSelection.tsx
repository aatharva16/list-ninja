
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PlatformToggle } from '@/components/platform-selection/PlatformToggle';
import { PincodeInput } from '@/components/platform-selection/PincodeInput';
import { usePlatformSelection } from '@/hooks/usePlatformSelection';

export default function PlatformSelection() {
  const navigate = useNavigate();
  const { platforms, selectedPlatforms, loading, fetchPlatforms, togglePlatform } = usePlatformSelection();
  const [pincode, setPincode] = useState('');
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    fetchPlatforms();
  }, []);

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
      console.log('Starting price comparison process...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      console.log('User authenticated:', user.id);

      // Save user platform selections
      console.log('Saving platform selections:', { pincode, platformIds: selectedPlatforms });
      const { error: selectionError } = await supabase
        .from('user_platform_selections')
        .insert({
          user_id: user.id,
          pincode,
          platform_ids: selectedPlatforms
        });

      if (selectionError) throw selectionError;

      // Fetch grocery items for the user
      console.log('Fetching grocery items...');
      const { data: groceryItems, error: groceryError } = await supabase
        .from('grocery_items')
        .select('name')
        .eq('user_id', user.id);

      if (groceryError) throw groceryError;

      if (!groceryItems || groceryItems.length === 0) {
        toast.error('No grocery items found. Please add items to your list first.');
        return;
      }

      console.log('Found grocery items:', groceryItems);

      // Clear previous scraped results
      console.log('Clearing previous results...');
      const { error: deleteError } = await supabase
        .from('scraped_results')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      // Start scraping for each platform
      for (const platformId of selectedPlatforms) {
        const platform = platforms.find(p => p.id === platformId);
        if (!platform) continue;

        console.log(`Starting scraping for platform: ${platform.name}`);
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

        console.log(`Scraping response for ${platform.name}:`, scrapedData);

        if (scrapeError) {
          console.error(`Error scraping from ${platform.name}:`, scrapeError);
          toast.error(`Error scraping from ${platform.name}: ${scrapeError.message}`);
          continue;
        }

        if (scrapedData?.success) {
          console.log(`Successfully scraped prices from ${platform.name}`);
          toast.success(`Successfully scraped prices from ${platform.name}`);
        }
      }

      // Navigate to comparison results page
      navigate('/comparison-results');
    } catch (error: any) {
      console.error('Error in price comparison:', error);
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

          <PincodeInput value={pincode} onChange={setPincode} />

          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">
              Select Platforms (Max 4)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {platforms.map((platform) => (
                <PlatformToggle
                  key={platform.id}
                  platform={platform}
                  isSelected={selectedPlatforms.includes(platform.id)}
                  onToggle={togglePlatform}
                />
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
