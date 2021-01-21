const { error404, CustomError } = require("../../utils/error-consts")

const Matches = mongoose.model("Matches")

const checkMatchExists = async (matchId) => {
	const match = await Matches.findById(matchId).lean()
	if (!match) throw new CustomError(error404, `Match not found`)
}

module.exports = {
	checkMatchExists,
}
