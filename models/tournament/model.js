const {
	teamRoles,
	teamRoleInvited,
	types,
	matchStates,
	teamSubmittedResults,
} = require("./consts")
const { Schema, model, ObjectId } = require("mongoose")

const tournamentSchema = new Schema(
	{
		name: { type: String, unique: true, required: true },
		show: { type: Boolean, required: true, default: false },
		startsOn: { type: Date, required: true },
		endsOn: { type: Date, required: true },
		game: { type: ObjectId, required: true, ref: "Game" },
		platform: { type: ObjectId, required: true, ref: "Platform" },
		ruleset: { type: ObjectId, required: true, ref: "Ruleset" },
		type: { type: String, required: true, enum: types },
		createdBy: { type: ObjectId, required: true, ref: "User" },
		imgUrl: { type: String, required: true },
		teams: [
			{
				name: { type: String, required: true },
				elo: { type: Number, required: true, default: 1500 },
				members: [
					{
						role: {
							type: String,
							enum: teamRoles,
							default: teamRoleInvited,
							required: true,
						},
						userId: { type: ObjectId, ref: "User", required: true },
					},
				],
			},
		],
		matches: [
			{
				teamOne: { type: String, required: true },
				teamTwo: String,
				createdBy: { type: ObjectId, required: true, ref: "User" },
				createdAt: { type: Date, required: true, default: Date.now() },
				acceptedAt: { type: Date },
				state: { type: String, enum: matchStates },
				teamOneResult: { type: String, enum: teamSubmittedResults },
				teamTwoResult: { type: String, enum: teamSubmittedResults },
			},
		],
	},
	{ timestamps: true }
)

const tournaments = model("Tournament", tournamentSchema)

module.exports = tournaments
