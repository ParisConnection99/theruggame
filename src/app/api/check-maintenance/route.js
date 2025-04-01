// app/api/check-maintenance/route.js
import { get } from '@vercel/edge-config';

export const runtime = 'edge';

export async function GET() {
  try {
    // Get both values from Edge Config in parallel
    const [isMaintenance, endTimestamp] = await Promise.all([
      get('isInMaintenanceMode'),
      get('maintenanceEndTime')
    ]);

    return Response.json({ 
      isMaintenance: !!isMaintenance,
      endTimestamp: endTimestamp || null  // Return null if no timestamp set
    });
  } catch (error) {
    console.error('Edge Config error:', error);
    return Response.json({ 
      isMaintenance: false,
      endTimestamp: null
    }, { status: 500 });
  }
}