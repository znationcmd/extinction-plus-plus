import {guarded} from '../../../lib/dashboard-auth';
import {readDb} from '../../../lib/db';
import board from '../../../lib/leaderboard.cjs';
export const GET=guarded(async()=>Response.json(board.leaderboard(await readDb())));
