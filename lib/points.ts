// ============================================================
// SMASHERS — Championship Points Calculation
// ============================================================
import { POINTS_MAP, type FinishPosition } from '@/types';

/**
 * Get points for a finish position
 */
export function getPointsForPosition(position: FinishPosition): number {
    return POINTS_MAP[position] || 0;
}

/**
 * Determine finish position based on round eliminated and total rounds
 */
export function calculateFinishPosition(
    roundEliminated: number,
    totalRounds: number,
    isChampion: boolean
): FinishPosition {
    if (isChampion) return 'champion';

    const roundsFromFinal = totalRounds - roundEliminated;
    switch (roundsFromFinal) {
        case 0: return 'runner_up';
        case 1: return 'semi_finalist';
        case 2: return 'quarter_finalist';
        default: return 'participant';
    }
}

/**
 * Calculate all player positions and points for a completed category bracket
 */
export function calculateCategoryResults(
    fixtures: { round_number: number; player1_id?: string; player2_id?: string; winner_id?: string; is_bye: boolean }[],
    totalRounds: number
): { playerId: string; position: FinishPosition; points: number }[] {
    const results: Map<string, { position: FinishPosition; points: number }> = new Map();
    const allPlayerIds = new Set<string>();

    // Collect all player IDs
    fixtures.forEach(f => {
        if (f.player1_id) allPlayerIds.add(f.player1_id);
        if (f.player2_id) allPlayerIds.add(f.player2_id);
    });

    // Find eliminated players per round
    fixtures.forEach(f => {
        if (f.winner_id && !f.is_bye) {
            const loserId = f.player1_id === f.winner_id ? f.player2_id : f.player1_id;
            if (loserId) {
                const position = calculateFinishPosition(f.round_number, totalRounds, false);
                results.set(loserId, { position, points: getPointsForPosition(position) });
            }
        }
    });

    // Find the final match to determine champion
    const finalMatch = fixtures.find(f => f.round_number === totalRounds);
    if (finalMatch?.winner_id) {
        results.set(finalMatch.winner_id, { position: 'champion', points: 50 });
        const runnerId = finalMatch.player1_id === finalMatch.winner_id
            ? finalMatch.player2_id
            : finalMatch.player1_id;
        if (runnerId) {
            results.set(runnerId, { position: 'runner_up', points: 30 });
        }
    }

    // Any player not explicitly placed gets participation points
    allPlayerIds.forEach(id => {
        if (!results.has(id)) {
            results.set(id, { position: 'participant', points: 5 });
        }
    });

    return Array.from(results.entries()).map(([playerId, data]) => ({
        playerId,
        ...data,
    }));
}
