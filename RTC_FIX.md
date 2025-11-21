# Guide de Correction - Erreur RTC Gateway

## Erreur Actuelle
```
AgoraRTCError CAN_NOT_GET_GATEWAY_SERVER: invalid vendor key, can not find appid
Code: 4096
```

## Cause
L'App ID utilisé n'est **pas reconnu** par les serveurs Agora. Cela signifie :
- L'App ID est incorrect
- L'App ID a été supprimé/désactivé
- L'App ID ne correspond pas au token fourni
- Le projet Agora n'existe plus ou a été supprimé

## Solutions

### Solution 1: Vérifier et Corriger l'App ID (RECOMMANDÉ)

1. **Allez sur la Console Agora**
   - https://console.agora.io
   - Connectez-vous avec votre compte

2. **Trouvez votre projet**
   - Allez dans "Project Management"
   - Cherchez le projet avec Primary Certificate ID: `4e7d29b89326451886bafd22746ec118`
   - OU créez un nouveau projet

3. **Copiez l'App ID**
   - Cliquez sur votre projet
   - Copiez l'**App ID** (pas le Primary Certificate ID)
   - C'est une chaîne de 32 caractères hexadécimaux

4. **Mettez à jour `appId.js`**
   ```javascript
   const appid = "VOTRE_NOUVEL_APP_ID_ICI"
   export default appid;
   ```

5. **Générez un nouveau token** (si Primary Certificate est activé)
   - Utilisez le générateur: https://www.agora.io/en/blog/token-generator/
   - OU utilisez l'API REST d'Agora
   - Mettez à jour `tokenConfig.js`

### Solution 2: Créer un Nouveau Projet Agora

1. Allez sur https://console.agora.io
2. Cliquez sur "Create Project"
3. Donnez un nom au projet
4. **IMPORTANT**: Choisissez "APP ID + Token" comme méthode d'authentification
5. Copiez le nouvel App ID
6. Mettez à jour `appId.js`
7. Si vous avez activé Primary Certificate, générez un token

### Solution 3: Désactiver Primary Certificate (pour tests)

1. Dans la console Agora, allez dans votre projet
2. Allez dans "Project Management" > "Edit"
3. **Désactivez** "Primary Certificate"
4. Le code fonctionnera sans token
5. Mettez dans `tokenConfig.js`:
   ```javascript
   export const FORCE_NO_TOKEN = true
   ```

### Solution 4: Utiliser FORCE_NO_TOKEN (temporaire)

Dans `tokenConfig.js`, mettez:
```javascript
export const FORCE_NO_TOKEN = true
```

Cela forcera l'utilisation sans token, mais cela ne fonctionnera que si Primary Certificate est désactivé.

## Vérification

Après avoir appliqué une solution, vérifiez dans la console:
- ✅ "App ID chargé: [votre-app-id]"
- ✅ "Connexion réussie avec token" OU "Connexion réussie sans token"
- ❌ Si vous voyez encore l'erreur, l'App ID est toujours invalide

## Note Importante

**RTM peut fonctionner même si RTC échoue!** 
- L'application continuera à fonctionner pour la synchronisation des membres
- Seul l'audio ne fonctionnera pas si RTC échoue
- Vous pouvez toujours voir les autres utilisateurs via RTM



