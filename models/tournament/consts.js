const teamRoleInvited = "INVITED"
const teamRoleMember = "MEMBER"
const teamRoleLeader = "LEADER"
const teamRoles = [teamRoleInvited, teamRoleMember, teamRoleLeader]

const tournamentType = "TOURNAMENT"
const ladderType = "LADDER"
const types = [tournamentType, ladderType]

// The current state of the match. This gets automatically updated given what each team says the result is
const matchStatePending = "PENDING",
	matchStateTie = "TIE",
	matchStateTeamOne = "TEAM1",
	matchStateTeamTwo = "TEAM2",
	matchStateDispute = "DISPUTE"
const matchStates = [
	matchStatePending,
	matchStateTie,
	matchStateTeamOne,
	matchStateTeamTwo,
	matchStateDispute,
]

const teamSubmittedMatchResultWin = "WIN",
	teamSubmittedMatchResultLoss = "LOSS",
	teamSubmittedMatchResultTie = "TIE"
const teamSubmittedResults = [
	teamSubmittedMatchResultWin,
	teamSubmittedMatchResultLoss,
	teamSubmittedMatchResultTie,
]

// Values that are added to a team object at runtime to tell the frontend if the team at it's current state can play in the tournament or not
const teamStatusOk = "OK"
const teamStatusNotOk = "NOT OK"

const secondsToAcceptLadderMatch = 15 * 60

module.exports = {
	teamRoleMember,
	teamRoleLeader,
	teamRoles,
	types,
	matchStatePending,
	matchStates,
	teamSubmittedResults,
	secondsToAcceptLadderMatch,
	teamStatusOk,
	teamStatusNotOk,
}
