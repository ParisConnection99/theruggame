"use server";

const APP_URL = "https://theruggame.fun";

export async function handleAddingActivityLog(logData, token) {
    // Validate logData
    if (!logData || typeof logData !== 'object') {
        throw new Error('Invalid log data. Must be an object.');
    }

    const { action_type, device_info, additional_metadata } = logData;

    if (!action_type || typeof action_type !== 'string') {
        throw new Error('Invalid or missing action_type.');
    }

    if (!device_info || typeof device_info !== 'object') {
        throw new Error('Invalid or missing device_info.');
    }

    // Validate token
    if (!token || typeof token !== 'string') {
        throw new Error('Invalid or missing token.');
    }

    // Check if the action type is allowed
    if (!isAllowedActionType(action_type)) {
        throw new Error('Action type not allowed.');
    }

    // Call the activity log API
    const response = await fetch(`${APP_URL}/api/activity_log`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action_type,
            actionDetails,
            device_info,
            additional_metadata,
        }),
    });

    // Handle response
    if (!response.ok) {
        const errorData = await response.json();
        logInfo('Activity Log Error', {
            error: errorData,
            timestamp: new Date(),
        });
        throw new Error(`Failed to log activity: ${errorData.error || 'Unknown error'}`);
    }

    // Log success
    logInfo('Activity Log Success', {
        action_type,
        timestamp: new Date(),
    });
}

function isAllowedActionType(action_type) {
    switch (action_type) {
        case 'user_login':
        case 'user_logout':
        case 'bet_placed':
        case 'username_changed':
        case 'cash_out_selected':
        case 'market_selected':
        case 'feature_market_selected':
        case 'support_selected':
        case 'how_it_works_selected':
            return true;

        default:
            return false;
    }
}