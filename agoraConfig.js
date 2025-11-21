// Configuration Agora - RTC et RTM
// 
// IMPORTANT: 
// - RTC (Real-Time Communication) utilise un App ID
// - RTM (Real-Time Messaging) peut utiliser le même App ID ou un AppKey séparé
// - Chat Service utilise un AppKey différent (format: orgName#appName)

// App ID pour RTC (Real-Time Communication - Audio/Video)
export const rtcAppId = "ea7f8444db754db0b406c2374270ad88"

// AppKey pour RTM/Chat (si différent de l'App ID RTC)
// Format: orgName#appName
// Pour RTM, vous pouvez généralement utiliser le même App ID que RTC
export const rtmAppKey = "411422168#1622987"

// Pour RTM, on utilise généralement le même App ID que RTC
// Si vous avez besoin d'utiliser l'AppKey séparé, décommentez la ligne suivante:
// export const rtmAppId = rtmAppKey
// Sinon, utilisez le même App ID:
export const rtmAppId = rtcAppId

// Export par défaut pour compatibilité avec le code existant
export default rtcAppId

