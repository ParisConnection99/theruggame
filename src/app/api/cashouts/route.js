// app/api/cashouts/route.js
import { serviceRepo } from '@/services/ServiceRepository';
import { geolocation } from '@vercel/edge';

export const config = {
  runtime: 'edge', // This is important to run at the edge
};


export async function GET(request) {
  try {
    // You might want to add admin authentication here
    const cashouts = await serviceRepo.cashoutService.fetchCashouts();

    return new Response(JSON.stringify(cashouts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, amount, wallet_ca, device_info } = body;

    if (!userId || !amount || !wallet_ca || !device_info) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: userId, amount, wallet_ca'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const geoData = geolocation(request);

    // Log all potential sources to debug
    console.log('Headers x-forwarded-for:', forwarded);
    console.log('Headers x-real-ip:', realIp);
    console.log('Geolocation data:', geoData);

    // Use fallback chain to get IP
    const ip = forwarded?.split(',')[0] ||
      realIp ||
      geoData.ip ||
      request.headers.get('cf-connecting-ip') || // Cloudflare specific
      'unknown';

    const enhanced_device_info = {
      ...device_info,
      geo: geoData ? { city: geoData.city, country: geoData.country, region: geoData.region } : {}
    };

    const cashout = await serviceRepo.cashoutService.createCashout(
      userId,
      parseFloat(amount),
      wallet_ca,
      enhanced_device_info,
      ip,
    );

    return new Response(JSON.stringify(cashout), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const status =
      error.message === 'User not found' ||
        error.message === 'Insufficient balance' ? 400 : 500;

    return new Response(JSON.stringify({ error: error.message }), {
      status,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}