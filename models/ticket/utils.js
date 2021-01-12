const mongoose = require("mongoose")

const Tickets = mongoose.model("Tickets")

const checkIfTicketExists = async (ticketId) => {
	const ticketExists = await Tickets.findOne({
		_id: ticketId,
	})

	if (!ticketExists) throw Error("Ticket does not exists")
}

module.exports = {
	checkIfTicketExists,
}
