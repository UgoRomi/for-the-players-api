const mongoose = require("mongoose")

const Tournament = mongoose.model("Tournament")

const checkUniqueName = async (name) => {
	await _checkUniqueField("name", name)
}

const checkTeamNameInTournament = async (name, { req }) => {
	const tournament = await Tournament.findById(req.params.tournamentId).lean()
	if (!tournament) throw Error("Tournament not found")
	if (tournament.teams.some((team) => team.name === name))
		throw Error(`A team named '${name}' already exists in this tournament`)
}

const _checkUniqueField = async (fieldName, fieldValue) => {
	const fieldAlreadyExists = await Tournament.findOne({
		[fieldName]: fieldValue,
	})
	if (fieldAlreadyExists) throw Error(`${fieldName} already in use`)
}

module.exports = {
	checkUniqueName,
	checkTeamNameInTournament,
}
