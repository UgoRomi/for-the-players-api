const mongoose = require("mongoose")
const User = mongoose.model("User")

const checkUniqueEmail = async (email) => {
	const userAlreadyExists = await User.findOne({
		email,
	})
	if (userAlreadyExists) throw Error("Email already in use")
}

const checkIfUserExists = async (email) => {
	const userAlreadyExists = await User.findOne({
		email,
	})
	if (!userAlreadyExists) throw Error("Email not in use")
}

module.exports = {
	checkUniqueEmail,
	checkIfUserExists,
}
