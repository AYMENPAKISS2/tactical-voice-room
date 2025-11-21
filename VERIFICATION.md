# Vérification de la Configuration

## ✅ App ID confirmé
- **App ID** : `ea7f8444db754db0b406c2374270ad88`

## ⚠️ Problème probable : Token incompatible

L'erreur "invalid vendor key" persiste, ce qui signifie probablement que :

1. **Le token ne correspond pas à cet App ID**
   - Le token fourni a peut-être été généré pour un autre App ID
   - Le token doit être généré spécifiquement pour l'App ID : `ea7f8444db754db0b406c2374270ad88`

2. **Le Primary Certificate ne correspond pas à cet App ID**
   - Primary Certificate ID fourni : `4e7d29b89326451886bafd22746ec118`
   - Vérifiez dans la Console Agora que ce Primary Certificate appartient bien au projet avec l'App ID `ea7f8444db754db0b406c2374270ad88`

## 🔧 Solution : Générer un nouveau token

### Option 1 : Via la Console Agora (Recommandé)

1. Allez sur https://console.agora.io
2. Sélectionnez le projet avec l'App ID : `ea7f8444db754db0b406c2374270ad88`
3. Allez dans "Project Management" > "Edit"
4. Utilisez le générateur de tokens
5. Générez un token RTC pour :
   - App ID : `ea7f8444db754db0b406c2374270ad88`
   - Channel Name : `main` (ou le nom de votre canal)
   - UID : `0` (ou un UID spécifique)
   - Expiration : 24 heures (ou selon vos besoins)
6. Copiez le nouveau token
7. Mettez à jour `tokenConfig.js` avec le nouveau token

### Option 2 : Désactiver Primary Certificate (Pour développement uniquement)

Si vous êtes en développement et n'avez pas besoin de sécurité renforcée :

1. Allez sur https://console.agora.io
2. Sélectionnez le projet avec l'App ID : `ea7f8444db754db0b406c2374270ad88`
3. Allez dans "Project Management" > "Edit"
4. Désactivez "Primary Certificate"
5. Dans le code, utilisez `token: null` (ce qui est déjà géré)

⚠️ **ATTENTION** : Ne désactivez pas Primary Certificate en production !

## 📝 Vérification

Après avoir généré un nouveau token ou désactivé Primary Certificate :

1. Rechargez l'application
2. Vérifiez la console du navigateur
3. Vous devriez voir : "RTC initialisé avec succès"
4. L'erreur "invalid vendor key" ne devrait plus apparaître

