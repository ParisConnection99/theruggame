"use server";

import { logInfo, logError } from '@/utils/logger';

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

    // Check if the action type is allowed
    if (!isAllowedActionType(action_type)) {
        throw new Error('Action type not allowed.');
    }

    console.log(`Token: ${token}`);

    // Call the activity log API
    const response = await fetch(`https://theruggame.fun/api/activity_log`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            action_type,
            device_info,
            additional_metadata,
        }),
    });

    // Handle response
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to log activity: ${errorData.error || 'Unknown error'}`);
    }
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