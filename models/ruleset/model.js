const { Schema, model, ObjectId } = require("mongoose")

const rulesetSchema = new Schema(
	{
		name: { type: String, unique: true, required: true },
		description: { type: String },
		maxNumberOfPlayersPerTeam: { type: Number, min: 1 },
		minNumberOfPlayersPerTeam: { type: Number, min: 1 },
		game: { type: ObjectId, required: true, ref: "Games" },
		maps: [
			{
				type: String,
			},
		],
		bestOf: { type: Number, required: true },
	},
	{ timestamps: true }
)

const ruleset = model("Rulesets", rulesetSchema)
module.exports = ruleset
