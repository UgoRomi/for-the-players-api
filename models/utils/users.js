const User = require("../user")


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
