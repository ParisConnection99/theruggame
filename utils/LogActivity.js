import { logInfo, logError } from '@/utils/logger';

export async function LogActivity(type, device_info, auth) {
    logInfo("Logging activity...", {});

    if (!auth || !auth.currentUser || !device_info || !type) {
        logInfo("Unable to log activity User data not available", {});
    }

    logInfo('Handling log activity', {});

    try {
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