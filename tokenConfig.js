// Configuration des tokens Agora
// NOTE: Ce token est temporaire et expirera. Pour la production, 
// vous devrez générer des tokens dynamiquement via un serveur backend.

// Primary Certificate ID
export const certificateId = "4e7d29b89326451886bafd22746ec118"

// Token d'accès temporaire (expirera après un certain temps)
// Pour générer un nouveau token, utilisez le générateur Agora ou votre serveur backend
export const token = "007eJxTYIjvv7I4lYdvSrJU5/NvF9vvrue99P/BAr6ER02yGU+nqh9XYEhNNE+zMDExSUkyNwUSBkkmBmbJRsbmJkbmBokpFhYJAaKZDYGMDI5v+xgZGSAQxGdhKEssyWdgAAC+ECB6"

// Option pour forcer l'utilisation sans token (pour tester si Primary Certificate est désactivé)
// Mettez cette variable à true pour ignorer le token
export const FORCE_NO_TOKEN = false

// Export conditionnel du token
export default FORCE_NO_TOKEN ? null : token

