import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting daily image cleanup task...')
    
    const now = new Date()
    let deletedCount = 0
    let errorCount = 0
    
    // Query expired images
    const { data: expiredImages, error: queryError } = await supabase
      .from('image_history')
      .select('id, user_id, url')
      .lte('expires_at', now.toISOString())
    
    if (queryError) {
      throw queryError
    }
    
    if (!expiredImages || expiredImages.length === 0) {
      console.log('No expired images found')
      return new Response(
        JSON.stringify({ 
          message: 'Cleanup completed',
          deletedCount: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Delete expired images
    for (const image of expiredImages) {
      try {
        console.log(`Deleting expired image ${image.id} for user ${image.user_id}`)
        
        // Delete from Storage if URL exists
        if (image.url) {
          try {
            // Extract file path from URL
            const urlParts = image.url.split('/')
            const bucketIndex = urlParts.findIndex(part => part === 'generated-images')
            if (bucketIndex !== -1) {
              const filePath = urlParts.slice(bucketIndex + 1).join('/')
              
              const { error: storageError } = await supabase.storage
                .from('generated-images')
                .remove([filePath])
              
              if (storageError) {
                console.error(`Failed to delete file from storage: ${storageError.message}`)
              }
            }
          } catch (storageError) {
            console.error('Storage deletion error:', storageError)
          }
        }
        
        // Delete from database
        const { error: dbError } = await supabase
          .from('image_history')
          .delete()
          .eq('id', image.id)
        
        if (dbError) {
          throw dbError
        }
        
        deletedCount++
      } catch (error) {
        console.error(`Error deleting image ${image.id}:`, error)
        errorCount++
      }
    }
    
    const result = {
      message: 'Cleanup completed',
      deletedCount,
      errorCount,
      totalProcessed: expiredImages.length
    }
    
    console.log('Cleanup result:', result)
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cleanup function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})