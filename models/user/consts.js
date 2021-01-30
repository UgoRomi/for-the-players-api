// Status
const userStatusNotVerified = "NOT_VERIFIED"
const userStatusVerified = "VERIFIED"
const userStatusBanned = "BANNED"
const userStatuses = [
	userStatusNotVerified,
	userStatusVerified,
	userStatusBanned,
]

// Permissions
// Games
const userPermissionGame = "GAME"
// Platforms
const userPermissionPlatform = "PLATFORM"
// Tournaments
const userPermissionTournament = "TOURNAMENT"
// Ruleset
const userPermissionRuleset = "RULESET"
// Tickets
const userPermissionTicket = "TICKET"
// Users
const userPermissionUser = "USER"
const userPermissions = [
	userPermissionGame,
	userPermissionPlatform,
	userPermissionTournament,
	userPermissionRuleset,
	userPermissionTicket,
	userPermissionUser,
]

const resetPasswordPage = "https://app.theplayers.tech/reset-password"

module.exports = {
	// Status
	userStatuses,
	userStatusNotVerified,
	userStatusBanned,
	userStatusVerified,

	//Permissions
	userPermissionPlatform,
	userPermissionGame,
	userPermissionTournament,
	userPermissionRuleset,
	userPermissionTicket,
	userPermissionUser,
	userPermissions,

	resetPasswordPage,
}
