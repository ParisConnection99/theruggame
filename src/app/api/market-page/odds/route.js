import { serviceRepo } from '@/services/ServiceRepository';

export async function POST(request) {
    try {
        const body = await request.json();
        const { id, type } = body;

        if (!id || !type) {
            return new Response(JSON.stringify({ error: 'Missing data.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        console.log(`Fetched data in route: id: ${id}, ${type}`);

        try {

            const currentOdds = await serviceRepo.oddsService.getCurrentOdds(id, type);

            return new Response(JSON.stringify(currentOdds), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });

        } catch (error) {
            console.error(`Error fetching current odds: ${error.message}`);
            throw error;
        }


    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}