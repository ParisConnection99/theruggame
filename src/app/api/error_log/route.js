import { serviceRepo } from '@/services/ServiceRepository';
import { geolocation } from '@vercel/edge';

export const config = {
    runtime: 'edge', // This is important to run at the edge
};

export async function POST(request) {
    try {
        const body = await request.json();

        const {
            key,
            device_info,
            type,
            message,
            stackTrace,
            location,
            severity,
        } = body;

        if (!type || typeof type !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid or missing action_type.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!message || typeof message !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid or missing action_type.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!stackTrace || typeof stackTrace !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid or missing action_type.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!location || typeof location !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid or missing action_type.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!severity || typeof severity !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid or missing action_type.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        if (!device_info || typeof device_info !== 'object') {
            return new Response(JSON.stringify({ error: 'Invalid or missing device_info.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const forwarded = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const geoData = geolocation(request);

        const ip =
            forwarded?.split(',')[0] ||
            realIp ||
            geoData?.ip ||
            request.headers.get('cf-connecting-ip') ||
            'unknown';

        const enhanced_device_info = {
            ...device_info,
            geo: geoData ? { city: geoData.city, country: geoData.country, region: geoData.region } : {},
        };

        const errorData = {
            wallet_ca: key,
            error_message: message,
            error_type: type,
            stack_trace: stackTrace,
            source_location: location,
            request_data: enhanced_device_info,
            ip: ip,
            severity: severity
        };

        try {

            await serviceRepo.errorService.createError(errorData);
            return new Response(JSON.stringify({ success: true, message: 'Error logged successfully.' }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' },
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: 'Failed to log errors.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}