# Configuration des Tokens Agora

## Fichier `tokenConfig.js`

Ce fichier contient la configuration des tokens Agora pour l'authentification RTM et RTC.

### Informations actuelles :
- **Primary Certificate ID** : `4e7d29b89326451886bafd22746ec118`
- **Token temporaire** : Configuré dans `tokenConfig.js`

## ⚠️ Important

Le token fourni est **temporaire** et expirera après un certain temps (généralement 24 heures). 

### Pour générer un nouveau token :

1. **Via la Console Agora** :
   - Connectez-vous à [console.agora.io](https://console.agora.io)
   - Allez dans votre projet
   - Utilisez l'outil de génération de tokens
   - Copiez le nouveau token dans `tokenConfig.js`

2. **Via un serveur backend** (recommandé pour la production) :
   - Créez un endpoint sur votre serveur qui génère des tokens dynamiquement
   - Utilisez le Primary Certificate ID pour signer les tokens
   - Appelez cet endpoint depuis votre application frontend

### Structure du token

Les tokens Agora contiennent généralement :
- L'App ID
- L'UID de l'utilisateur
- Le timestamp d'expiration
- La signature cryptographique

### Sécurité

⚠️ **Ne commitez JAMAIS les tokens dans un dépôt public !**

Ajoutez `tokenConfig.js` à votre `.gitignore` :

```
tokenConfig.js
```

Pour la production, utilisez des variables d'environnement ou un serveur backend sécurisé.

