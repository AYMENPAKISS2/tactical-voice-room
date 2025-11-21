# Guide de dépannage - Erreur "invalid vendor key"

## ❌ Erreur: `AgoraRTCError CAN_NOT_GET_GATEWAY_SERVER: invalid vendor key, can not find appid`

Cette erreur signifie que l'App ID dans `appId.js` ne correspond **PAS** au projet avec le Primary Certificate fourni.

## 🔍 Comment trouver le bon App ID

### Étape 1: Connectez-vous à la Console Agora
1. Allez sur https://console.agora.io
2. Connectez-vous avec votre compte

### Étape 2: Trouvez le projet avec le Primary Certificate
1. Dans la liste des projets, cherchez celui qui a le **Primary Certificate ID** : `4e7d29b89326451886bafd22746ec118`
2. Cliquez sur ce projet

### Étape 3: Copiez l'App ID
1. Dans la page du projet, vous verrez l'**App ID**
2. Copiez cet App ID (il devrait ressembler à : `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### Étape 4: Mettez à jour appId.js
1. Ouvrez `complete-app/appId.js`
2. Remplacez l'App ID actuel par celui que vous venez de copier
3. Sauvegardez le fichier

### Étape 5: Vérifiez le token
Le token fourni doit correspondre au **même App ID**. Si vous avez changé l'App ID :
1. Allez dans la Console Agora
2. Utilisez le générateur de tokens
3. Générez un nouveau token pour le bon App ID
4. Mettez à jour `tokenConfig.js` avec le nouveau token

## 📋 Vérification rapide

Après avoir mis à jour l'App ID, vérifiez dans la console du navigateur :
- ✅ L'App ID chargé doit correspondre à celui de votre projet
- ✅ Aucune erreur "invalid vendor key" ne doit apparaître
- ✅ Le message "RTC initialisé avec succès" doit s'afficher

## ⚠️ Cas particuliers

### Si vous avez plusieurs projets Agora
Assurez-vous d'utiliser l'App ID du projet qui a le Primary Certificate ID `4e7d29b89326451886bafd22746ec118`.

### Si le token ne fonctionne pas
1. Vérifiez que le token n'a pas expiré (les tokens temporaires expirent généralement après 24h)
2. Générez un nouveau token pour le bon App ID
3. Mettez à jour `tokenConfig.js`

### Si Primary Certificate n'est pas activé
Si vous n'avez pas activé Primary Certificate dans votre projet :
- Vous pouvez utiliser `token: null` dans le code
- L'App ID seul devrait suffire

## 🔗 Liens utiles

- Console Agora: https://console.agora.io
- Documentation Agora: https://docs.agora.io
- Générateur de tokens: Disponible dans la Console Agora

