import { useAuth } from './FirebaseProvider';
import { UAParser } from 'ua-parser-js';
import { logInfo, logError } from '@/utils/logger';

export async function LogActivity(type) {
    const parser = new UAParser();
    const { auth } = useAuth();

    logInfo("Logging activity...", {});

    if (!auth || !auth.currentUser) {
        logInfo("Unable to log activity User data not available", {});
    }

    logInfo('Handling log activity', {});

    try {
        const deviceInfo = {
            browser: parser.getBrowser(),
            device: parser.getDevice(),
            os: parser.getOS()
        };

        const token = await auth.currentUser?.getIdToken();

        const activityResponse = await fetch(`/api/activity_log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                action_type: type,
                device_info: deviceInfo,
                additional_metadata: additional_meta
            }),
        });

        // Handle response
        if (!activityResponse.ok) {
            const errorData = await activityResponse.json();
            logInfo('Activity Log Error', {
                error: errorData,
                timestamp: new Date(),
            });
            throw new Error(`Failed to log activity: ${errorData.error || 'Unknown error'}`);
        }
    } catch (error) {
        console.error(error);
    }
}