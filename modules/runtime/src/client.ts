/** Client-safe Agent Teams roster and task views plus the `agentTeam` projection vocabulary. */

export type * from './task-work-types.ts'

export { TeamMessageId } from './types.ts'
export { readProjectPlan } from './project-plan.ts'

export type {
  TeamBriefSnapshot,
  TeamAdviserDecision,
  TeamBriefView,
  TeamMessageSnapshot,
  TeamMailboxMessageView,
  TeamMailboxPage,
  SendTeamMessageResult,
  TeamGoalDefinition,
  TeamExecutionScope,
  TeamGoalScope,
  TeamGoalChange,
  TeamGoalProposal,
  TeamGoalDecision,
  TeamGoalSnapshot,
  TeamGoalReview,
  ProposeTeamGoalRequest,
  TeamExpertBinding,
  TeamExpertId,
  TeamExpertDefinition,
  TeamExpertView,
  TeamMemberSettings,
  ConfigureTeamMemberModelRequest,
  ConfigureTeamMemberRoleRequest,
  TeamMemberFunction,
  TeamMemberWorkspace,
  TeamRoleProfile,
  TeamMemberPhase,
  TeamMemberProjection,
  TeamMemberView,
  TeamProjection,
  TeamTaskId,
  TeamTaskStatus,
  TeamTaskView,
  ListTeamTaskArchiveRequest,
  TeamTaskArchivePage,
} from './types.ts'
