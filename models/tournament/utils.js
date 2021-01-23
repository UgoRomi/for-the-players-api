const mongoose = require("mongoose")
const { error404, CustomError } = require("../../utils/error-consts")
const { matchStatusTeamTwo } = require("./consts")
const { matchStatusTeamOne } = require("./consts")
const { teamSubmittedMatchResultWin } = require("./consts")
const { matchStatusDispute } = require("./consts")
const { matchStatusTie } = require("./consts")
const { teamSubmittedMatchResultTie } = require("./consts")
const { matchStatusPending } = require("./consts")
const { isAfter } = require("date-fns")

const Tournaments = mongoose.model("Tournaments")

const checkUniqueName = async (name) => {
	await _checkUniqueField("name", name)
}

const checkTournamentExists = async (tournamentId) => {
	if (tournamentId) {
		const tournament = await Tournaments.findById(tournamentId).lean()
		if (!tournament) throw new CustomError(error404, "Tournament not found")
	}
}

const checkTournamentHasNotStarted = async (tournamentId) => {
	const tournament = await Tournaments.findById(tournamentId).lean()
	if (isAfter(new Date(), tournament.startsOn))
		throw Error("Tournament already started")
}

const _checkUniqueField = async (fieldName, fieldValue) => {
	const fieldAlreadyExists = await Tournaments.findOne({
		[fieldName]: fieldValue,
	})
	if (fieldAlreadyExists) throw Error(`${fieldName} already in use`)
}
/**
 * Calculates and adds the "status" property to every match
 * @param matches
 * @param teams
 * @returns {Promise<*>}
 */
const calculateMatchStatus = async (matches, teams) => {
	return matches.map((match) => {
		const teamOneObj = teams.find(
			(team) => team._id.toString() === match.teamOne.toString()
		)
		const formattedMatch = {
			_id: match._id,
			teamOne: {
				_id: match.teamOne,
				result: match.teamOneResult,
				name: teamOneObj.name,
				elo: teamOneObj.elo,
			},
			createdAt: match.createdAt,
			numberOfPlayers: match.numberOfPlayers,
			rulesetId: match.rulesetId,
			maps: match.maps,
		}

		if (match.teamTwo) {
			const teamTwoObj = teams.find(
				(team) => team._id.toString() === match.teamTwo.toString()
			)
			formattedMatch.teamTwo = {
				_id: match.teamTwo,
				result: match.teamTwoResult,
				name: teamTwoObj.name,
				elo: teamTwoObj.elo,
			}
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

/**
 * Calculates the wins, losses and ties for each team
 * @param matches
 * @param teams
 * @returns {*}
 */
const calculateTeamResults = (matches, teams) => {
	return teams.map((team) => {
		const teamMatches = matches.filter(
			(match) =>
				match.teamOne._id.toString() === team._id.toString() ||
				match.teamTwo?._id.toString() === team._id.toString()
		)
		team.ties = teamMatches.filter(
			(match) => match.status === matchStatusTie
		).length
		team.wins = teamMatches.filter(
			(match) =>
				(match.teamOne._id.toString() === team._id.toString() &&
					match.status === matchStatusTeamOne) ||
				(match.teamTwo?._id.toString() === team._id.toString() &&
					match.status === matchStatusTeamTwo)
		).length
		team.losses = teamMatches.filter(
			(match) =>
				(match.teamOne._id.toString() === team._id.toString() &&
					match.status === matchStatusTeamTwo) ||
				(match.teamTwo?._id.toString() === team._id.toString() &&
					match.status === matchStatusTeamOne)
		).length

		return team
	})
}

module.exports = {
	checkUniqueName,
	checkTournamentExists,
	calculateMatchStatus,
	calculateTeamResults,
	checkTournamentHasNotStarted,
}
