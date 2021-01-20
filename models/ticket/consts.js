const ticketStatusNew = "NEW"
const ticketStatusInProgress = "IN_PROGRESS"
const ticketStatusSolved = "SOLVED"
const ticketStatusDeleted = "DELETED"
const ticketStatuses = [
	ticketStatusNew,
	ticketStatusInProgress,
	ticketStatusSolved,
	ticketStatusDeleted,
]

const ticketCategoryDispute = "DISPUTE"
const ticketCategoryGeneralInquiry = "GENERAL_INQUIRY"
const ticketCategoryPayment = "PAYMENT"
const ticketCategories = [
	ticketCategoryDispute,
	ticketCategoryGeneralInquiry,
	ticketCategoryPayment,
]
module.exports = {
	ticketStatusNew,
	ticketStatusInProgress,
	ticketStatusSolved,
	ticketStatusDeleted,
	ticketStatuses,
	ticketCategoryDispute,
	ticketCategories,
}
