import { get } from '@vercel/edge-config';

export const runtime = 'edge';

export async function GET() {
  try {
    const isMaintenance = await get('isInMaintenanceMode');
    return Response.json({ isMaintenance: !!isMaintenance });
  } catch (error) {
    return Response.json({ isMaintenance: false });
  }
}