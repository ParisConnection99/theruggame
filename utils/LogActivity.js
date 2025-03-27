import { logInfo, logError } from '@/utils/logger';
import { UAParser } from 'ua-parser-js';
import { useAuth } from '@/components/FirebaseProvider';
const parser = new UAParser();

export async function LogActivity(type, auth) {
    if (!auth || !auth.currentUser || !type) {
        logInfo("Unable to log activity User data not available", {});
    }

    const { authUser } = useAuth();

    if (!authUser) {
        logInfo('Auth not available', {});
    } 

    try {
        const device_info = {
            browser: parser.getBrowser(),
            device: parser.getDevice(),
            os: parser.getOS()
        }

        const token = await auth.currentUser?.getIdToken();

        const activityResponse = await fetch(`/api/activity_log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                action_type: type,
                device_info: device_info,
                additional_metadata: "Nothing rn."
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