import { serviceRepo } from '@/services/ServiceRepository';

export async function GET(request) {
    try {
        const url = new URL(request.url);
        const sessionId = url.searchParams.get('id'); // Extract 'id' from query params
        const publicKey = url.searchParams.get('key');


        if (sessionId) {
            const session = await serviceRepo.sessionDataService.getById(sessionId);
            return new Response(JSON.stringify(session), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else if (publicKey) {
            const session = await serviceRepo.sessionDataService.getByWallet_ca(publicKey);
            return new Response(JSON.stringify(session), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ error: 'Session ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
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

export async function PATCH(request) {
    try {
        const body = await request.json();

        await serviceRepo.sessionDataService.updateSession(body.id, body.session);
        
        return new Response(JSON.stringify({ completed: true }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error updating session request:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}