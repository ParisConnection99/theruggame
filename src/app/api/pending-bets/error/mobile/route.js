import { serviceRepo } from '@/services/ServiceRepository';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();

        try {
            await serviceRepo.pendingBetsService.updateStatusWithId(body.id, 'error');
        } catch (error) {
            throw error;
        }

    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to updated pending bets.' },
            { status: 500 }
        );
    }
}