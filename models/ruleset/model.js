const { Schema, model, ObjectId } = require("mongoose")

const rulesetSchema = new Schema(
	{
		name: { type: String, unique: true, required: true },
		description: { type: String, unique: true },
		maxNumberOfPlayersPerTeam: { type: Number, min: 1 },
		minNumberOfPlayersPerTeam: { type: Number, min: 1 },
		game: { type: ObjectId, required: true, ref: "Game" },
	},
	{ timestamps: true }
)

const ruleset = model("Ruleset", rulesetSchema)
module.exports = ruleset
