const mongoose = require("mongoose")
const { teamRoleLeader } = require("./consts")
const { error404, CustomError } = require("../../utils/error-consts")
const { matchStatusTeamTwo } = require("./consts")
const { matchStatusTeamOne } = require("./consts")
const { teamSubmittedMatchResultWin } = require("./consts")
const { matchStatusDispute } = require("./consts")
const { matchStatusTie } = require("./consts")
const { teamSubmittedMatchResultTie } = require("./consts")
const { matchStatusPending } = require("./consts")
const { isAfter } = require("date-fns")

const Tournament = mongoose.model("Tournaments")

const checkUniqueName = async (name) => {
	await _checkUniqueField("name", name)
}

const checkTeamNameInTournament = async (name, { req }) => {
	const tournament = await Tournament.findById(req.params.tournamentId).lean()
	if (!tournament) throw Error("Tournament not found")

	if (req.params.teamId) {
		if (
			tournament.teams.some(
				(team) =>
					team._id.toString() !== req.params.teamId && team.name === name
			)
		)
			throw Error(`A team named '${name}' already exists in this tournament`)
	} else {
		if (tournament.teams.some((team) => team.name === name))
			throw Error(`A team named '${name}' already exists in this tournament`)
	}
}

const checkTournamentExists = async (tournamentId) => {
	const tournament = await Tournament.findById(tournamentId).lean()
	if (!tournament) throw new CustomError(error404, "Tournament not found")
}

const checkTournamentHasNotStarted = async (tournamentId) => {
	const tournament = await Tournament.findById(tournamentId).lean()
	if (isAfter(new Date(), tournament.startsOn))
		throw Error("Tournament already started")
}

const checkTeamExists = async (teamId, { req }) => {
	const tournament = await Tournament.findById(req.params.tournamentId).lean()
	if (
		!tournament.teams.some((team) => team._id.toString() === teamId.toString())
	)
		throw new CustomError(error404, `Team not found`)
}

const checkMatchExists = async (matchId, { req }) => {
	const tournament = await Tournament.findById(req.params.tournamentId).lean()
	if (
		!tournament.matches.some(
			(match) => match._id.toString() === matchId.toString()
		)
	)
		throw new CustomError(error404, `Match not found`)
}

const checkUserInTeam = async (teamId, { req }) => {
	const tournament = await Tournament.findById(req.params.tournamentId).lean()
	const team = tournament.teams.find(
		(team) => team._id.toString() === teamId.toString()
	)
	if (!team.members.some((member) => member.userId.toString() === req.user.id))
		throw Error("You are not part of this team")
}

const checkUserIsLeaderInTeam = async (teamId, { req }) => {
	const tournament = await Tournament.findById(req.params.tournamentId).lean()
	const team = tournament.teams.find(
		(team) => team._id.toString() === teamId.toString()
	)
	if (
		!team.members.some(
			(member) =>
				member.userId.toString() === req.user.id &&
				member.role === teamRoleLeader
		)
	)
		throw Error("You are not the leader of this team")
}

const checkTeamHasOngoingMatches = async (teamId, { req }) => {
	const tournament = await Tournament.findById(
		req.params.tournamentId,
		"teams matches"
	).lean()

	if (
		tournament.matches.find(
			(match) =>
				(match.teamOne?.toString() === teamId && !match.teamOneResult) ||
				(match.teamTwo?.toString() === teamId && !match.teamTwoResult)
		)
	)
		throw Error("This team already has an ongoing match")
}

const userIsLeaderMiddleware = async (teamId, { req }) => {
	return userIsLeader(teamId, req.params.tournamentId, req.user.id)
}

const _checkUniqueField = async (fieldName, fieldValue) => {
	const fieldAlreadyExists = await Tournament.findOne({
		[fieldName]: fieldValue,
	})
	if (fieldAlreadyExists) throw Error(`${fieldName} already in use`)
}

const userNotInATeam = async (userId, { req }) => {
	const tournament = await Tournament.findById(req.params.tournamentId).lean()
	if (
		tournament.teams.some((team) =>
			team.members.some((member) => member.userId.toString() === userId)
		)
	)
		throw Error("The user you are tying to invite is already in another team")
}

const userIsLeader = async (teamId, tournamentId, userId) => {
	const tournament = await Tournament.findById(tournamentId, "teams").lean()

	const team = tournament.teams.find((team) => team._id.toString() === teamId)

	return team.members.some(
		(member) =>
			member.userId.toString() === userId && member.role === teamRoleLeader
	)
}

const calculateMatchStatus = async (matches, teams) => {
	return matches.map((match) => {
		const teamOneName = teams.find(
			(team) => team._id.toString() === match.teamOne.toString()
		).name
		const teamTwoName = teams.find(
			(team) => team._id.toString() === match.teamTwo.toString()
		).name
		const formattedMatch = {
			_id: match._id,
			teamOne: {
				_id: match.teamOne,
				result: match.teamOneResult,
				name: teamOneName,
			},
			teamTwo: {
				_id: match.teamTwo,
				result: match.teamTwoResult,
				name: teamTwoName,
			},
			createdAt: match.createdAt,
		}
		if (!match.teamTwo || !match.teamOneResult || !match.teamTwoResult)
			formattedMatch.status = matchStatusPending
		else if (
			match.teamOneResult === teamSubmittedMatchResultTie &&
			match.teamTwoResult === teamSubmittedMatchResultTie
		)
			formattedMatch.status = matchStatusTie
		else if (match.teamOneResult === match.teamTwoResult)
			formattedMatch.status = matchStatusDispute
		else if (match.teamOneResult === teamSubmittedMatchResultWin)
			formattedMatch.status = matchStatusTeamOne
		else formattedMatch.status = matchStatusTeamTwo
		return formattedMatch
	})
}

module.exports = {
	checkUniqueName,
	checkTeamNameInTournament,
	checkTournamentExists,
	checkTeamExists,
	userNotInATeam,
	userIsLeader,
	checkTeamHasOngoingMatches,
	checkUserInTeam,
	checkUserIsLeaderInTeam,
	checkMatchExists,
	userIsLeaderMiddleware,
	calculateMatchStatus,
	checkTournamentHasNotStarted,
}
