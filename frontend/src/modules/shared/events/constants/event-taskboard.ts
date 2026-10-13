import { IdeaTeam } from '../components/EventTeamFormationStep';
import { EventIdea } from '../components/EventIdeaSubmissionStep';
import { porscadClient } from '../../../../lib/porscad/porscad-client';

export interface EventTaskItem {
  id: string;
  title: string;
  points: number;
  completed: boolean;
  completedAt?: string;
}

export interface EventTeamTaskEntry {
  manualAdjustment: number;
  tasks: EventTaskItem[];
}

export interface EventTaskBoardState {
  teams: Record<string, EventTeamTaskEntry>;
}

export function taskBoardStorageKey(eventId: string): string {
  return `rokad_event_taskboard_${eventId}`;
}

export function emptyTaskBoard(): EventTaskBoardState {
  return { teams: {} };
}

export function loadTaskBoard(eventId: string): EventTaskBoardState {
  try {
    const saved = localStorage.getItem(taskBoardStorageKey(eventId));
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object' && parsed.teams && typeof parsed.teams === 'object') {
        return parsed as EventTaskBoardState;
      }
    }
  } catch (e) {
    console.error('Failed to parse task board', e);
  }
  return emptyTaskBoard();
}

export function saveTaskBoard(eventId: string, state: EventTaskBoardState): void {
  try {
    localStorage.setItem(taskBoardStorageKey(eventId), JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save task board', e);
  }
}

export function ensureTeamEntry(
  state: EventTaskBoardState,
  teamKey: string,
): EventTaskBoardState {
  if (state.teams[teamKey]) return state;
  return {
    ...state,
    teams: {
      ...state.teams,
      [teamKey]: { manualAdjustment: 0, tasks: [] },
    },
  };
}

export function teamTaskScore(entry?: EventTeamTaskEntry): number {
  if (!entry) return 0;
  const fromTasks = entry.tasks.reduce(
    (sum, t) => sum + (t.completed ? Number(t.points) || 0 : 0),
    0,
  );
  return fromTasks + (Number(entry.manualAdjustment) || 0);
}

export interface TaskBoardTeamInfo {
  key: string;
  label: string;
  ideaId: string;
  idea?: EventIdea;
  team?: IdeaTeam;
  memberNames: string[];
}

export function getWinningIdeas(eventId: string, ideas: EventIdea[]): EventIdea[] {
  const poll = porscadClient.getLocalPollData(eventId);
  if (!poll || !poll.isClosed) return [];

  const winningOptionIds =
    poll.winningOptionIds || (poll.winningOptionId ? [poll.winningOptionId] : []);
  const topCount =
    Number(poll.topWinnersCount) > 0 ? Number(poll.topWinnersCount) : winningOptionIds.length || 1;

  const sortedOptions = [...(poll.options || [])].sort(
    (a, b) => (b.voteCount || 0) - (a.voteCount || 0)
  );
  const topWinningOptions = sortedOptions.slice(0, topCount);

  const winningIdeaIds = new Set<string>();
  for (const opt of topWinningOptions) {
    if (opt.ideaId) winningIdeaIds.add(opt.ideaId);
    if (opt.id) winningIdeaIds.add(opt.id);
  }
  for (const wId of winningOptionIds) {
    winningIdeaIds.add(wId);
  }

  const matched = ideas.filter(
    (idea) =>
      winningIdeaIds.has(idea.id) ||
      topWinningOptions.some((o) => o.text && o.text.includes(idea.title))
  );

  if (matched.length > 0) return matched;
  return ideas.slice(0, topCount);
}

export function buildTaskBoardTeams(
  eventId: string,
  ideas: EventIdea[],
  teamsMap: Record<string, IdeaTeam>,
): TaskBoardTeamInfo[] {
  const winning = getWinningIdeas(eventId, ideas);
  const teamsWithMembers = ideas.filter((idea) => teamsMap[idea.id]);
  const source = winning.length > 0 ? winning : teamsWithMembers.length > 0 ? teamsWithMembers : ideas;

  return source.map((idea) => {
    const team = teamsMap[idea.id];
    const memberNames = team
      ? [team.leaderName, ...team.members.map((m) => m.name)].filter(Boolean)
      : [idea.authorName].filter(Boolean);

    return {
      key: idea.id,
      label: team?.ideaTitle || idea.title,
      ideaId: idea.id,
      idea,
      team,
      memberNames,
    };
  });
}

export function loadTeamsMap(eventId: string): Record<string, IdeaTeam> {
  try {
    const saved = localStorage.getItem(`rokad_event_teams_${eventId}`);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse teams map', e);
  }
  return {};
}

export function findStudentTeamKeys(
  teams: TaskBoardTeamInfo[],
  firstName?: string,
  lastName?: string,
): string[] {
  const first = (firstName || '').trim().toLowerCase();
  const last = (lastName || '').trim().toLowerCase();
  if (!first && !last) return [];

  const full = `${first} ${last}`.trim();

  return teams
    .filter((t) =>
      t.memberNames.some((name) => {
        const n = (name || '').trim().toLowerCase();
        if (!n) return false;
        // Full-name equality when both parts exist
        if (full && n === full) return true;
        // Require last name (non-empty) so first-name-only substring never matches everyone
        if (last && n.includes(last)) {
          return !first || n.includes(first) || n.split(/\s+/).includes(last);
        }
        return false;
      }),
    )
    .map((t) => t.key);
}
