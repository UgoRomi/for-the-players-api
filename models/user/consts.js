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
const userPermissionCreateGame = "CREATE_GAME"
const userPermissionReadGame = "READ_GAME"
const userPermissionUpdateGame = "UPDATE_GAME"
const userPermissionDeleteGame = "DELETE_GAME"
//Platforms
const userPermissionCreatePlatform = "CREATE_PLATFORM"
//Tournaments
const userPermissionCreateTournament = "CREATE_TOURNAMENT"
//Ruleset
const userPermissionCreateRuleset = "CREATE_RULESET"
const userPermissions = [
	userPermissionCreateGame,
	userPermissionReadGame,
	userPermissionUpdateGame,
	userPermissionDeleteGame,
	userPermissionCreatePlatform,
	userPermissionCreateTournament,
	userPermissionCreateRuleset,
]

module.exports = {
	// Status
	userStatuses,
	userStatusNotVerified,
	userStatusBanned,
	userStatusVerified,

	//Permissions
	userPermissionCreatePlatform,
	userPermissionCreateGame,
	userPermissionCreateTournament,
	userPermissionCreateRuleset,
	userPermissions,
}
