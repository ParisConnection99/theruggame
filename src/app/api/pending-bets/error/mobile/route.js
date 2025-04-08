import { serviceRepo } from '@/services/ServiceRepository';
import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const body = await request.json();

        const id = body.id;
        const errorMessage = body.errorMessage;

        try {

            if (errorMessage === 'Transaction was rejected by user') {
                await serviceRepo.pendingBetsService.removePendingBetById(id);
                // Remove pedding bet
            } else {
                await serviceRepo.pendingBetsService.updateStatusWithId(id, 'error');
            }
        } catch (error) {
            throw error;
        }

        return NextResponse.json(
            { success: true },
            { status: 200 }
        );

    } catch (error) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to updated pending bets.' },
            { status: 500 }
        );
    }
}