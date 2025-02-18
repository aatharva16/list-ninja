
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import FirecrawlApp from "@mendable/firecrawl-js"
import { z } from "zod"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  pincode: string;
  groceryItems: string[];
  platformId: string;
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

    const app = new FirecrawlApp({
      apiKey: Deno.env.get('FIRECRAWL_API_KEY')
    });

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
    
    // Define Zod schema for product extraction
    const productSchema = z.object({
      product_name: z.string(),
      price: z.number(),
      out_of_stock: z.boolean(),
      unit_size: z.string().nullable()
    });

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

      try {
        const scrapeResult = await app.extract([searchUrl], {
          prompt: `Search for ${item} on ${platform.name} and extract the following information for the top 3 products:
                  - Product name
                  - Price in INR (as a number)
                  - Whether the product is out of stock (true/false)
                  - Unit size/weight (if available)`,
          schema: productSchema,
          headers: {
            'Cookie': `location=${pincode}`
          }
        });

        if (!scrapeResult.success) {
          throw new Error(`Failed to scrape: ${scrapeResult.error}`);
        }

        console.log(`Extraction results for ${item}:`, scrapeResult.data);

        if (scrapeResult.success && Array.isArray(scrapeResult.data)) {
          // Process and store results
          const { error: insertError } = await supabaseClient
            .from('scraped_results')
            .insert(scrapeResult.data.map((product) => ({
              user_id: user.id,
              platform_id: platformId,
              grocery_item: item,
              product_name: product.product_name,
              price: product.price,
              unit_size: product.unit_size,
              is_available: !product.out_of_stock
            })))

          if (insertError) {
            console.error('Error inserting results:', insertError)
          } else {
            console.log(`Successfully inserted results for ${item}`)
          }

          results.push(...scrapeResult.data)
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
