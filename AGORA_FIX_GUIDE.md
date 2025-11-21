# Guide de Correction - Erreur App ID Agora

## Erreur Actuelle
```
AgoraRTCError CAN_NOT_GET_GATEWAY_SERVER: invalid vendor key, can not find appid
```

## Causes Possibles

### 1. App ID Incorrect
- L'App ID dans `appId.js` ne correspond pas à un projet Agora valide
- L'App ID a été supprimé ou désactivé dans la console Agora

### 2. Token Expiré ou Invalide
- Le token dans `tokenConfig.js` a expiré
- Le token ne correspond pas à l'App ID utilisé
- Le token a été généré pour un autre projet

### 3. Primary Certificate Configuration
- Primary Certificate est activé mais le token est invalide
- Primary Certificate est désactivé mais on essaie d'utiliser un token

## Solutions

### Solution 1: Vérifier l'App ID
1. Allez sur https://console.agora.io
2. Connectez-vous à votre compte
3. Trouvez le projet avec Primary Certificate ID: `4e7d29b89326451886bafd22746ec118`
4. Copiez l'App ID de ce projet
5. Mettez à jour `appId.js` avec le bon App ID

### Solution 2: Générer un Nouveau Token
1. Dans la console Agora, allez dans votre projet
2. Allez dans "Project Management" > "Edit"
3. Notez votre Primary Certificate ID
4. Utilisez le générateur de token Agora:
   - https://www.agora.io/en/blog/token-generator/
   - Ou utilisez l'API REST d'Agora pour générer un token
5. Mettez à jour `tokenConfig.js` avec le nouveau token

### Solution 3: Désactiver Primary Certificate (pour tests)
1. Dans la console Agora, allez dans votre projet
2. Allez dans "Project Management" > "Edit"
3. Désactivez "Primary Certificate"
4. Le code fonctionnera sans token

### Solution 4: Utiliser FORCE_NO_TOKEN
Dans `tokenConfig.js`, mettez:
```javascript
export const FORCE_NO_TOKEN = true
```

## Vérification

Après avoir appliqué une solution, vérifiez dans la console:
- ✅ "App ID chargé: [votre-app-id]"
- ✅ "Connexion réussie avec token" OU "Connexion réussie sans token"
- ❌ Si vous voyez encore l'erreur, essayez une autre solution

