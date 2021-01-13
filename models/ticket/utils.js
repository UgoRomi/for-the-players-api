const mongoose = require("mongoose")
const { error404, CustomError } = require("../../utils/error-consts")
const { ticketStatuses } = require("./consts")
const { isAfter } = require("date-fns")

const Tickets = mongoose.model("Tickets")

const checkTicketExists = async (ticketId) => {
	if (ticketId) {
		const ticket = await Tickets.findById(ticketId).lean()
		if (!ticket) throw new CustomError(error404, "Ticket not found")
	}
}
module.exports = {
	checkTicketExists,
}
