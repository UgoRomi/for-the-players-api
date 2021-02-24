const tournamentType = "TOURNAMENT";
const ladderType = "LADDER";
const bracketType = "BRACKET";
const types = [tournamentType, ladderType, bracketType];

// The current state of the match
const matchStatusPending = "PENDING";
const matchStatusTie = "TIE";
const matchStatusTeamOne = "TEAM1";
const matchStatusTeamTwo = "TEAM2";
const matchStatusDispute = "DISPUTE";
const matchStates = [
  matchStatusPending,
  matchStatusTie,
  matchStatusTeamOne,
  matchStatusTeamTwo,
  matchStatusDispute,
];

const updateMatchPostResult = "POST_RESULT";
const updateMatchActions = [updateMatchPostResult];

// Values that are added to a team object at runtime to tell the frontend if the team at it's current state can play in the tournament or not
const teamStatusOk = "OK";
const teamStatusNotOk = "NOT OK";

const secondsToAcceptLadderMatch = 15 * 60;

module.exports = {
  tournamentType,
  ladderType,
  bracketType,
  types,
  matchStatusPending,
  matchStatusTie,
  matchStatusTeamOne,
  matchStatusTeamTwo,
  matchStatusDispute,
  matchStates,
  secondsToAcceptLadderMatch,
  teamStatusOk,
  teamStatusNotOk,
  updateMatchActions,
  updateMatchPostResult,
};
