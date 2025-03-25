import { serviceRepo } from '@/services/ServiceRepository';


export async function POST(request) {
    try {
        const body = await request.json();

        console.log(`body: ${body}`);

        await serviceRepo.sessionDataService.createSession(body);

    } catch (error) {
        console.error('Error processing user request:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}