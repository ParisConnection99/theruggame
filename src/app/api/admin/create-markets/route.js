// import { serviceRepo } from '@/services/ServiceRepository';


// export async function POST(request) {
//   try {
//       // Extract API key from header
//       const apiKey = request.headers.get('x-api-key');
      
//       // Check if API key is valid (use environment variable for security)
//       if (apiKey !== process.env.ADMIN_API_KEY) {
//           return new Response(JSON.stringify({ error: 'Unauthorized' }), {
//               status: 401,
//               headers: { 'Content-Type': 'application/json' }
//           });
//       }
      
//       const token = await serviceRepo.marketCreationService.fetchMarkets();
//       return new Response(JSON.stringify(token), {
//           status: 200,
//           headers: { 'Content-Type': 'application/json' }
//       });
//   } catch (error) {
//       return new Response(JSON.stringify({ error: error.message }), {
//           status: 500,
//           headers: { 'Content-Type': 'application/json' }
//       });
//   }
// }
import { serviceRepo } from '@/services/ServiceRepository';

export async function POST(request) {
  console.log('POST request received to /api/admin/create-markets');
  console.log('Request method:', request.method);
  console.log('Request URL:', request.url);
  
  // Log all headers
  console.log('Request headers:');
  for (const [key, value] of request.headers.entries()) {
    console.log(`  ${key}: ${value}`);
  }

  try {
    // Extract API key from header
    const apiKey = request.headers.get('x-api-key');
    console.log('API Key received:', apiKey ? '********' : 'none');
    
    // Check if API key is valid
    if (apiKey !== process.env.ADMIN_API_KEY) {
      console.log('API Key validation failed');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('API Key validation successful');
    console.log('Calling marketCreationService.fetchMarkets()');
    const token = await serviceRepo.marketCreationService.fetchMarkets();
    console.log('fetchMarkets completed successfully');
    
    return new Response(JSON.stringify(token), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in POST handler:', error);
    console.error('Error stack:', error.stack);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Add OPTIONS method handler to support preflight requests
export async function OPTIONS(request) {
  console.log('OPTIONS request received');
  
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key, User-Agent',
      'Content-Type': 'application/json'
    }
  });
}