import { serviceRepo } from '@/services/ServiceRepository';

export async function GET(request, { params }) {
    try {
        params = await params;
        const sessionId = params.id;

        console.log(`Session id: ${sessionId}`)

        if (!sessionId) {
            return new Response(JSON.stringify({ error: 'Session ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const session = await serviceRepo.sessionDataService.getById(sessionId);
        return new Response(JSON.stringify(session), {
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

        console.log(`body: ${body}`);

        await serviceRepo.sessionDataService.createSession(body);

        return new Response(JSON.stringify({ completed: true }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error processing session request:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}