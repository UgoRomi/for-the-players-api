const mongoose = require("mongoose")
const { teamRoleLeader } = require("./consts")
const { error404, CustomError } = require("../../utils/error-consts")

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

const checkTeamExists = async (teamId, { req }) => {
	const tournament = await Tournament.findById(req.params.tournamentId).lean()
	if (
		!tournament.teams.some((team) => team._id.toString() === teamId.toString())
	)
		throw new CustomError(error404, `Team not found`)
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
}
