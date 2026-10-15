import * as XLSX from 'xlsx';
import { ActiveSession, LeaderboardEntry } from '../types';

export class ExportService {
  /**
   * Generates CSV string for session leaderboard
   */
  public static generateLeaderboardCSV(session: ActiveSession, leaderboard: LeaderboardEntry[]): string {
    const headers = ['Rank', 'Participant Name', 'Total Score', 'Last Question Points', 'Winning Streak', 'Status'];
    const rows = leaderboard.map(entry => [
      entry.rank,
      `"${entry.nickname.replace(/"/g, '""')}"`,
      entry.totalScore,
      entry.lastQuestionScore,
      entry.streak,
      entry.isConnected ? 'Connected' : 'Disconnected'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    return '\uFEFF' + csvContent; // UTF-8 BOM for Excel compatibility
  }

  /**
   * Generates multi-sheet Excel workbook as a Buffer
   */
  public static generateExcelWorkbook(session: ActiveSession, leaderboard: LeaderboardEntry[]): Buffer {
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Final Leaderboard
    const leaderboardData = leaderboard.map(entry => ({
      'Rank': entry.rank,
      'Participant Name': entry.nickname,
      'Total Score': entry.totalScore,
      'Last Question Points': entry.lastQuestionScore,
      'Streak': entry.streak,
      'Status': entry.isConnected ? 'Active' : 'Offline'
    }));
    const leaderboardSheet = XLSX.utils.json_to_sheet(leaderboardData);
    XLSX.utils.book_append_sheet(workbook, leaderboardSheet, 'Leaderboard');

    // Sheet 2: Questions Summary
    const questionsData = session.questions.map((q, idx) => {
      const qResp = session.responses.get(q.id) || [];
      const correctCount = qResp.filter(r => r.isCorrect).length;
      const totalResp = qResp.length;
      const accuracy = totalResp > 0 ? Math.round((correctCount / totalResp) * 100) : 0;
      const totalTimeMs = qResp.reduce((acc, r) => acc + r.responseTimeMs, 0);
      const avgTimeSec = totalResp > 0 ? parseFloat((totalTimeMs / totalResp / 1000).toFixed(2)) : 0;

      return {
        'Question #': idx + 1,
        'Question Text': q.questionText,
        'Time Limit (s)': q.timeLimit,
        'Total Responses': totalResp,
        'Correct Count': correctCount,
        'Accuracy %': `${accuracy}%`,
        'Avg Response Time (s)': avgTimeSec
      };
    });
    const questionsSheet = XLSX.utils.json_to_sheet(questionsData);
    XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Question Analysis');

    // Sheet 3: Individual Responses
    const individualResponses: any[] = [];
    session.questions.forEach((q, idx) => {
      const qResp = session.responses.get(q.id) || [];
      qResp.forEach(r => {
        individualResponses.push({
          'Question #': idx + 1,
          'Participant': r.nickname,
          'Is Correct': r.isCorrect ? 'YES' : 'NO',
          'Points Earned': r.pointsEarned,
          'Response Time (s)': (r.responseTimeMs / 1000).toFixed(2)
        });
      });
    });

    if (individualResponses.length > 0) {
      const responsesSheet = XLSX.utils.json_to_sheet(individualResponses);
      XLSX.utils.book_append_sheet(workbook, responsesSheet, 'All Responses');
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}
