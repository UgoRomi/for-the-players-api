const { error404, CustomError } = require("../../utils/error-consts")
const mongoose = require("mongoose")

const Matches = mongoose.model("Matches")

const checkMatchExists = async (matchId) => {
	const match = await Matches.findById(matchId).lean()
	if (!match) throw new CustomError(error404, `Match not found`)
}

const checkTeamHasOngoingMatches = async (teamId, { req }) => {
	if (
		await Matches.findOne({
			tournamentId: req.params.tournamentId,
			$or: [
				{ teamOne: teamId, teamOneResult: null },
				{ teamTwo: teamId, teamTwoResult: null },
			],
		})
	)
		throw Error("This team already has an ongoing match")
}

module.exports = {
	checkMatchExists,
	checkTeamHasOngoingMatches,
}
