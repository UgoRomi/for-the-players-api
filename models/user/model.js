const bcrypt = require("bcrypt")
const { Schema, model } = require("mongoose")
const {
	userStatuses,
	userStatusNotVerified,
	userPermissions,
} = require("./consts")
require("dotenv").config()

const userSchema = new Schema(
	{
		username: String,
		email: String,
		password: String,
		status: {
			type: String,
			enum: userStatuses,
			default: userStatusNotVerified,
		},
		permissions: {
			permission: {
				type: String,
				enum: userPermissions,
			},
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

const User = model("User", userSchema)

module.exports = User
