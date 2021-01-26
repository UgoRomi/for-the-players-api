const { types } = require("./consts")
const { Schema, model, ObjectId } = require("mongoose")

const tournamentSchema = new Schema(
	{
		name: { type: String, unique: true, required: true },
		show: { type: Boolean, required: true, default: false },
		startsOn: { type: Date, required: true },
		endsOn: { type: Date, required: true },
		game: { type: ObjectId, required: true, ref: "Games" },
		platform: { type: ObjectId, required: true, ref: "Platforms" },
		rulesets: { type: Array, required: true, ref: "Rulesets" },
		type: { type: String, required: true, enum: types },
		createdBy: { type: ObjectId, required: true, ref: "Users" },
		imgUrl: { type: String, required: true },
		open: { type: Boolean, required: true, default: true },
		maxTeamSizePerMatch: { type: Number },
		minTeamSizePerMatch: { type: Number },
	},
	{ timestamps: true }
)

const tournaments = model("Tournaments", tournamentSchema)

module.exports = tournaments
