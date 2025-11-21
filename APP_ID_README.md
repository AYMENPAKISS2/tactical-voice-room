# Configuration de l'App ID Agora

## ⚠️ Erreur "invalid vendor key, can not find appid"

Cette erreur se produit généralement lorsque :

1. **L'App ID ne correspond pas au projet avec le Primary Certificate**
   - Le Primary Certificate ID fourni : `4e7d29b89326451886bafd22746ec118`
   - Vérifiez que l'App ID dans `appId.js` correspond au même projet

2. **L'App ID est incorrect ou n'existe pas**
   - Vérifiez l'App ID dans la [Console Agora](https://console.agora.io)
   - Assurez-vous que l'App ID est copié correctement (sans espaces)

3. **Le token ne correspond pas à l'App ID**
   - Le token doit être généré pour le même App ID
   - Si vous avez généré un token pour un autre App ID, cela causera cette erreur

## Comment vérifier et corriger

1. **Connectez-vous à la Console Agora** : https://console.agora.io
2. **Trouvez votre projet** avec le Primary Certificate ID : `4e7d29b89326451886bafd22746ec118`
3. **Copiez l'App ID** de ce projet
4. **Mettez à jour `appId.js`** avec le bon App ID
5. **Générez un nouveau token** pour cet App ID si nécessaire

## Structure du fichier appId.js

```javascript
const appid = "VOTRE-APP-ID-ICI"

export default appid;
```

## Vérification

Après avoir mis à jour l'App ID, vérifiez dans la console du navigateur :
- L'App ID chargé doit correspondre à celui de votre projet
- Aucune erreur "invalid vendor key" ne doit apparaître

