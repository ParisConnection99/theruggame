import { UAParser } from 'ua-parser-js';
const parser = new UAParser();
import { logInfo, logError } from '@/utils/logger';

export async function errorLog(type, message, stackTrace, location, severity, key = "") {
    if (!type || !message || !stackTrace || !location || !severity) {
        logInfo('Missing parameters error logs.');
        return;
    }

    try {
        const device_info = {
            browser: parser.getBrowser(),
            device: parser.getDevice(),
            os: parser.getOS()
        }

        logInfo('Before loggging error');

        const response = await fetch('/api/error_log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                key: key,
                device_info: device_info,
                type: type,
                message: message,
                stackTrace: stackTrace,
                location: location,
                severity: severity,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            // Log Error
        }
    } catch (error) {
        console.error(error);
    }
}