const { teamRoleLeader } = require("./consts")
const { error404, CustomError } = require("../../utils/error-consts")
const mongoose = require("mongoose")

const Teams = mongoose.model("Teams")

const checkTeamNameInTournament = async (name, { req }) => {
	const { tournamentId, teamId } = req.params

	if (teamId) {
		if (await Teams.findOne({ name, tournamentId, _id: teamId }).lean())
			throw Error(`A team named '${name}' already exists in this tournament`)
	} else {
		if (await Teams.findOne({ name, tournamentId }).lean())
			throw Error(`A team named '${name}' already exists in this tournament`)
	}
}

const checkTeamExists = async (teamId, { req }) => {
	const { tournamentId } = req.params
	if (!(await Teams.findOne({ tournamentId, _id: teamId }).lean()))
		throw new CustomError(error404, `Team not found`)
}

const checkUserInTeam = async (teamId, { req }) => {
	const { tournamentId } = req.params
	if (
		!(await Teams.findOne({
			_id: teamId,
			tournamentId,
			members: { userId: req.user.id },
		}))
	)
		throw Error("You are not part of this team")
}

const checkUserIsLeaderInTeam = async (teamId, { req }) => {
	const { tournamentId } = req.params
	if (!(await userIsLeader(teamId, tournamentId, req.user.id)))
		throw Error("You are not the leader of this team")
}

const userIsLeader = async (teamId, tournamentId, userId) => {
	return !!(await Teams.findOne({
		_id: teamId,
		tournamentId,
		members: { $elemMatch: { userId, role: teamRoleLeader } },
	}).lean())
}

const userIsLeaderMiddleware = async (teamId, { req }) => {
	return userIsLeader(teamId, req.params.tournamentId, req.user.id)
}

const userNotInATeam = async (userId, { req }) => {
	const { tournamentId } = req.params
	await Teams.findOne({ tournamentId, members: { userId } })
	if (await Teams.findOne({ tournamentId, members: { userId } }))
		throw Error("The user you are tying to invite is already in another team")
}

module.exports = {
	checkTeamNameInTournament,
	checkTeamExists,
	checkUserInTeam,
	checkUserIsLeaderInTeam,
	userIsLeader,
	userIsLeaderMiddleware,
	userNotInATeam,
}
