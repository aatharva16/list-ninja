
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const firecrawl = new FirecrawlApp({
      apiKey: Deno.env.get('FIRECRAWL_API_KEY') ?? '',
    })

    const { pincode, groceryItems, platformId } = await req.json() as RequestBody

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

    const results = []
    
    for (const item of groceryItems) {
      console.log(`Scraping Blinkit for item: ${item}`)
      
      const searchUrl = `https://blinkit.com/s/?q=${encodeURIComponent(item)}`
      const result = await firecrawl.crawlUrl(searchUrl, {
        limit: 5, // Limit to top 5 results per item
        cookies: [{
          name: 'location',
          value: pincode,
          domain: 'blinkit.com'
        }],
        scrapeOptions: {
          selectors: {
            productName: '.product-name',
            price: '.product-price',
            unitSize: '.unit-size',
            specialOffer: '.special-offer',
            availability: '.availability-status'
          }
        }
      })

      if (result.success) {
        // Process and store results
        const { data: insertResult, error: insertError } = await supabaseClient
          .from('scraped_results')
          .insert(result.data.map((product: any) => ({
            user_id: user.id,
            platform_id: platformId,
            grocery_item: item,
            product_name: product.productName || 'N/A',
            price: parseFloat(product.price?.replace(/[^0-9.]/g, '') || '0'),
            unit_size: product.unitSize || null,
            special_offer: product.specialOffer || null,
            is_available: product.availability !== 'Out of Stock'
          })))

        if (insertError) {
          console.error('Error inserting results:', insertError)
        }

        results.push(...result.data)
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in scrape-blinkit function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
