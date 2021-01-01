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
//Platforms
const userPermissionPlatform = "PLATFORM"
//Tournaments
const userPermissionTournament = "TOURNAMENT"
//Ruleset
const userPermissionRuleset = "RULESET"
const userPermissions = [
	userPermissionGame,
	userPermissionPlatform,
	userPermissionTournament,
	userPermissionRuleset,
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
	userPermissions,

	resetPasswordPage,
}
