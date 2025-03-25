import { serviceRepo } from '@/services/ServiceRepository';


export async function POST(request) {
    try {
        const body = await request.json();

        await serviceRepo.sessionDataService.createSession(body.sessionData);

    } catch (error) {
        console.error('Error processing user request:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}