const teamRoleMember = "MEMBER"
const teamRoleLeader = "LEADER"
const teamRoles = [teamRoleMember, teamRoleLeader]

const tournamentType = "TOURNAMENT"
const ladderType = "LADDER"
const types = [tournamentType, ladderType]

// The current state of the match
const matchStatusPending = "PENDING",
	matchStatusTie = "TIE",
	matchStatusTeamOne = "TEAM1",
	matchStatusTeamTwo = "TEAM2",
	matchStatusDispute = "DISPUTE"
const matchStates = [
	matchStatusPending,
	matchStatusTie,
	matchStatusTeamOne,
	matchStatusTeamTwo,
	matchStatusDispute,
]

const teamSubmittedMatchResultWin = "WIN",
	teamSubmittedMatchResultLoss = "LOSS",
	teamSubmittedMatchResultTie = "TIE"
const teamSubmittedResults = [
	teamSubmittedMatchResultWin,
	teamSubmittedMatchResultLoss,
	teamSubmittedMatchResultTie,
]

const updateMatchPostResult = "POST_RESULT"
const updateMatchActions = [updateMatchPostResult]

// Values that are added to a team object at runtime to tell the frontend if the team at it's current state can play in the tournament or not
const teamStatusOk = "OK"
const teamStatusNotOk = "NOT OK"

const secondsToAcceptLadderMatch = 15 * 60

module.exports = {
	teamRoleMember,
	teamRoleLeader,
	teamRoles,
	types,
	matchStatusPending,
	matchStatusTie,
	matchStatusTeamOne,
	matchStatusTeamTwo,
	matchStatusDispute,
	matchStates,
	teamSubmittedMatchResultTie,
	teamSubmittedMatchResultWin,
	teamSubmittedResults,
	secondsToAcceptLadderMatch,
	teamStatusOk,
	teamStatusNotOk,
	updateMatchActions,
	updateMatchPostResult,
}
