// ============================================================
// SMASHERS — Bracket & League Fixture Generation
// ============================================================
import { v4 as uuidv4 } from 'uuid';
import type { Player, Fixture } from '@/types';

/**
 * Get the next power of 2 >= n
 */
export function nextPowerOf2(n: number): number {
    let p = 1;
    while (p < n) p *= 2;
    return p;
}

/**
 * Get round name from round number and total rounds
 */
export function getRoundName(roundNumber: number, totalRounds: number): string {
    const roundsFromEnd = totalRounds - roundNumber;
    switch (roundsFromEnd) {
        case 0: return 'Final';
        case 1: return 'Semi-Final';
        case 2: return 'Quarter-Final';
        case 3: return 'Round of 16';
        case 4: return 'Round of 32';
        default: return `Round ${roundNumber}`;
    }
}

/**
 * Generate a single-elimination bracket from a list of players.
 * BYE players are automatically advanced to the next round.
 */
export function generateBracket(
    players: Player[],
    tournamentId: string,
    categoryId: string
): Fixture[] {
    if (players.length < 2) return [];

    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const fixtures: Fixture[] = [];
    let matchNumber = 1;

    let currentRoundPlayersCnt = shuffled.length;
    let round = 1;

    while (currentRoundPlayersCnt > 1) {
        const matchesInRound = Math.ceil(currentRoundPlayersCnt / 2);
        
        for (let i = 0; i < matchesInRound; i++) {
            let p1 = undefined;
            let p2 = undefined;
            let isBye = false;

            if (round === 1) {
                p1 = shuffled[i * 2];
                p2 = shuffled[i * 2 + 1];
                if (!p2) {
                    isBye = true;
                }
            }

            const fixture: Fixture = {
                id: uuidv4(),
                tournament_id: tournamentId,
                category_id: categoryId,
                round_number: round,
                round_name: `Round ${round}`,
                match_number: matchNumber++,
                player1_id: p1?.id,
                player2_id: p2?.id,
                is_bye: isBye,
                status: isBye ? 'completed' : 'scheduled',
                winner_id: isBye ? p1?.id : undefined,
                created_at: new Date().toISOString(),
                player1: p1 || undefined,
                player2: p2 || undefined,
            };
            fixtures.push(fixture);
        }

        currentRoundPlayersCnt = matchesInRound;
        round++;
    }

    const totalRounds = round - 1;
    fixtures.forEach(f => {
        f.round_name = getRoundName(f.round_number, totalRounds);
    });

    const round1Fixtures = fixtures.filter(f => f.round_number === 1);
    const round2Fixtures = fixtures.filter(f => f.round_number === 2);

    round1Fixtures.forEach((match, matchIdx) => {
        if (match.is_bye && match.winner_id) {
            const nextMatchIdx = Math.floor(matchIdx / 2);
            if (nextMatchIdx < round2Fixtures.length) {
                const nextFixture = round2Fixtures[nextMatchIdx];
                const nIdx = fixtures.findIndex(f => f.id === nextFixture.id);
                const winnerPlayer = match.player1_id === match.winner_id ? match.player1 : match.player2;

                if (matchIdx % 2 === 0) {
                    fixtures[nIdx] = { ...fixtures[nIdx], player1_id: match.winner_id, player1: winnerPlayer };
                } else {
                    fixtures[nIdx] = { ...fixtures[nIdx], player2_id: match.winner_id, player2: winnerPlayer };
                }
            }
        }
    });

    return fixtures;
}

/**
 * Generate round-robin (league) fixtures where every player plays every other player once.
 */
export function generateLeagueFixtures(
    players: Player[],
    tournamentId: string,
    categoryId: string
): Fixture[] {
    if (players.length < 2) return [];

    const fixtures: Fixture[] = [];
    let matchNumber = 1;

    for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
            fixtures.push({
                id: uuidv4(),
                tournament_id: tournamentId,
                category_id: categoryId,
                round_number: 1,
                round_name: 'League',
                match_number: matchNumber++,
                player1_id: players[i].id,
                player2_id: players[j].id,
                player1: players[i],
                player2: players[j],
                is_bye: false,
                status: 'scheduled',
                created_at: new Date().toISOString(),
            });
        }
    }

    return fixtures;
}

/**
 * Compute league standings from fixtures.
 * Returns sorted standings array.
 */
export interface LeagueStanding {
    playerId: string;
    playerName: string;
    academyName?: string;
    played: number;
    won: number;
    lost: number;
    points: number;
}

export function calculateLeagueStandings(
    fixtures: Fixture[],
    players: Player[]
): LeagueStanding[] {
    const standingsMap = new Map<string, LeagueStanding>();

    // Initialize standings for all players
    players.forEach(p => {
        standingsMap.set(p.id, {
            playerId: p.id,
            playerName: p.full_name,
            academyName: p.academy_name,
            played: 0,
            won: 0,
            lost: 0,
            points: 0,
        });
    });

    // Calculate from completed matches
    fixtures.forEach(f => {
        if (f.status === 'completed' && f.winner_id) {
            const loserId = f.player1_id === f.winner_id ? f.player2_id : f.player1_id;

            const winner = standingsMap.get(f.winner_id);
            if (winner) {
                winner.played++;
                winner.won++;
                winner.points += 2; // 2 points for a win
            }

            if (loserId) {
                const loser = standingsMap.get(loserId);
                if (loser) {
                    loser.played++;
                    loser.lost++;
                    loser.points += 0; // 0 points for a loss
                }
            }
        }
    });

    return Array.from(standingsMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.won !== a.won) return b.won - a.won;
        return a.playerName.localeCompare(b.playerName);
    });
}

/**
 * Determine finish position based on round eliminated and total rounds
 */
export function getFinishPosition(
    roundEliminated: number,
    totalRounds: number,
    isWinner: boolean
): string {
    if (isWinner) return 'champion';
    const roundsFromEnd = totalRounds - roundEliminated;
    switch (roundsFromEnd) {
        case 0: return 'runner_up';
        case 1: return 'semi_finalist';
        case 2: return 'quarter_finalist';
        default: return 'participant';
    }
}

/**
 * Get brackets grouped by round for display
 */
export function groupByRound(fixtures: Fixture[]): Map<number, Fixture[]> {
    const map = new Map<number, Fixture[]>();
    fixtures.forEach(f => {
        if (!map.has(f.round_number)) map.set(f.round_number, []);
        map.get(f.round_number)!.push(f);
    });
    // Sort each round by match number
    map.forEach(matches => matches.sort((a, b) => a.match_number - b.match_number));
    return map;
}
