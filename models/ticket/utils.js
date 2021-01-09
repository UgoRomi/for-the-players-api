const mongoose = require("mongoose")
const { error404, CustomError } = require("../../utils/error-consts")
const { ticketStatuses } = require("./consts")
const { isAfter } = require("date-fns")

const Tickets = mongoose.model("Tickets")

const checkUniqueName = async (name) => {
	await _checkUniqueField("name", name)
}

module.exports = {
	checkUniqueName,
}
