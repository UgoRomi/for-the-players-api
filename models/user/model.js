const bcrypt = require("bcrypt")
const { Schema, model, ObjectId } = require("mongoose")
const {
	userStatuses,
	userStatusNotVerified,
	userPermissions,
} = require("./consts")
require("dotenv").config()

const userSchema = new Schema(
	{
		username: { type: String, unique: true, required: true },
		email: { type: String, unique: true, required: true },
		password: { type: String, unique: true, required: true },
		status: {
			type: String,
			enum: userStatuses,
			default: userStatusNotVerified,
			unique: true,
			required: true,
		},
		permissions: {
			permission: {
				type: String,
				enum: userPermissions,
			},
		},
		platforms: {
			id: { type: ObjectId, required: true },
			username: { type: string, required: true },
		},
	},
	{ timestamps: true }
)

// Middlewares
userSchema.pre("save", async function (next) {
	try {
		this.password = await bcrypt.hash(
			this.password,
			parseInt(process.env.PASSWORD_SALT_ROUNDS)
		)
	} catch (e) {
		next(e)
	}
})

// Instance methods
userSchema.methods.checkPassword = (password) => {
	return bcrypt.compareSync(password, this.password)
}

// Statics
userSchema.statics.isEmailUsed = (email) => {
	return this.findOne({ email })
}

const user = model("User", userSchema)

module.exports = user
