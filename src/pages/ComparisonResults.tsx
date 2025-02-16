
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ScrapedResult {
  id: string;
  grocery_item: string;
  product_name: string;
  price: number;
  unit_size: string | null;
  special_offer: string | null;
  is_available: boolean;
}

interface GroupedResults {
  [key: string]: ScrapedResult[];
}

export default function ComparisonResults() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groupedResults, setGroupedResults] = useState<GroupedResults>({});

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      console.log('Fetching results...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        toast.error('Please login to view results');
        navigate('/auth');
        return;
      }
      console.log('User authenticated:', user.id);

      const { data, error } = await supabase
        .from('scraped_results')
        .select('*')
        .eq('user_id', user.id)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching results:', error);
        throw error;
      }

      console.log('Fetched results:', data);

      // Group results by grocery item
      const grouped = (data || []).reduce((acc: GroupedResults, result) => {
        console.log('Processing result:', result);
        if (!acc[result.grocery_item]) {
          acc[result.grocery_item] = [];
        }
        // Only keep top 3 results per item
        if (acc[result.grocery_item].length < 3) {
          acc[result.grocery_item].push(result);
        }
        return acc;
      }, {});

      console.log('Grouped results:', grouped);
      setGroupedResults(grouped);
    } catch (error: any) {
      console.error('Error in fetchResults:', error);
      toast.error('Error fetching results: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return `₹${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto p-6">
          Loading results...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <Button
            onClick={() => navigate('/platform-selection')}
            variant="outline"
            className="mb-6"
          >
            <ArrowLeft className="mr-2" />
            Back to Platforms
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Blinkit Price Comparison</h1>
          
          {Object.keys(groupedResults).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No results found. Try searching for different items.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {Object.entries(groupedResults).map(([item, results]) => (
                <Card key={item}>
                  <CardHeader>
                    <CardTitle className="text-xl capitalize">{item}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {results.map((result, index) => (
                        <div
                          key={result.id}
                          className="flex items-start justify-between p-4 bg-white rounded-lg border"
                        >
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Best Price
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium">{result.product_name}</h3>
                            {result.unit_size && (
                              <p className="text-sm text-gray-500">Size: {result.unit_size}</p>
                            )}
                            {result.special_offer && (
                              <p className="text-sm text-blue-600">{result.special_offer}</p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {formatPrice(result.price)}
                            </p>
                            {!result.is_available && (
                              <span className="text-xs text-red-600">Out of Stock</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
