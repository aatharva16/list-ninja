
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FirecrawlApp from 'https://esm.sh/@mendable/firecrawl-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  pincode: string;
  groceryItems: string[];
  platformId: string;
}

interface ExtractedProduct {
  product_name: string;
  price: number;
  Outofstock: boolean;
  "Website Name": string;
  Quantity: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Edge function started');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const firecrawl = new FirecrawlApp({
      apiKey: Deno.env.get('FIRECRAWL_API_KEY') ?? '',
    })

    console.log('Getting request body...');
    const { pincode, groceryItems, platformId } = await req.json() as RequestBody
    console.log('Received request with:', { pincode, groceryItems, platformId })

    // Get the user ID from the request
    const authHeader = req.headers.get('Authorization')?.split('Bearer ')[1]
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(authHeader)
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Authenticated user:', user.id)

    // Get platform details
    const { data: platform } = await supabaseClient
      .from('platforms')
      .select('name')
      .eq('id', platformId)
      .single()

    if (!platform) {
      throw new Error('Platform not found')
    }

    console.log('Found platform:', platform.name);
    const results = []
    
    for (const item of groceryItems) {
      console.log(`Scraping for item: ${item}`)
      
      let searchUrl;
      if (platform.name === 'Blinkit') {
        searchUrl = `https://blinkit.com/s/?q=${encodeURIComponent(item)}`;
      } else if (platform.name === 'Zepto') {
        searchUrl = `https://www.zepto.in/search?q=${encodeURIComponent(item)}`;
      } else if (platform.name === 'Swiggy Instamart') {
        searchUrl = `https://www.swiggy.com/search?query=${encodeURIComponent(item)}`;
      } else {
        console.log('Unsupported platform:', platform.name);
        continue;
      }

      console.log('Searching URL:', searchUrl);

      const extractSchema = {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                product_name: { type: 'string' },
                price: { type: 'number' },
                Outofstock: { type: 'boolean' },
                'Website Name': { type: 'string' },
                Quantity: { type: ['string', 'null'] }
              },
              required: ['product_name', 'price', 'Outofstock', 'Website Name']
            }
          }
        }
      }

      try {
        const result = await firecrawl.extract([searchUrl], {
          prompt: `Search for ${item} on ${platform.name} with the location set to pincode ${pincode}. Extract the price for the top 3 cheapest search results, including the product name and price.`,
          schema: extractSchema,
          headers: {
            'Cookie': `location=${pincode}; domain=${platform.name.toLowerCase().includes('blinkit') ? 'blinkit.com' : 
                     platform.name.toLowerCase().includes('zepto') ? 'zepto.in' : 
                     'swiggy.com'}`
          }
        })

        console.log(`Extraction results for ${item}:`, result);

        if (result.success && result.data.products) {
          // Process and store results
          const { error: insertError } = await supabaseClient
            .from('scraped_results')
            .insert(result.data.products.map((product: ExtractedProduct) => ({
              user_id: user.id,
              platform_id: platformId,
              grocery_item: item,
              product_name: product.product_name,
              price: product.price,
              unit_size: product.Quantity,
              is_available: !product.Outofstock
            })))

          if (insertError) {
            console.error('Error inserting results:', insertError)
          } else {
            console.log(`Successfully inserted results for ${item}`)
          }

          results.push(...result.data.products)
        }
      } catch (error) {
        console.error(`Error scraping ${item} from ${platform.name}:`, error);
        // Continue with other items even if one fails
        continue;
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scraping function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
