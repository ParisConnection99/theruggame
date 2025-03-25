import { serviceRepo } from '@/services/ServiceRepository';


export async function POST(request) {
    try {
        const body = await request.json();

        console.log(`body: ${body}`);

        await serviceRepo.sessionDataService.createSession(body);

        return new Response(JSON.stringify({ completed: true }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error processing user request:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}