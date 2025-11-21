# Informations sur le Service Chat Agora

## 📋 Informations fournies

Vous avez fourni les informations suivantes pour le **Chat Service** d'Agora :

- **AppKey**: `411422168#1622987`
- **OrgName**: `411422168`
- **AppName**: `1622987`
- **WebSocket Address**: `msync-api-41.chat.agora.io`
- **REST API**: `a41.chat.agora.io`

## ⚠️ Différence importante

### Chat Service vs RTM

Le **Chat Service** d'Agora est différent du **RTM (Real-Time Messaging)** utilisé dans cette application :

1. **Chat Service** (`411422168#1622987`)
   - Service de messagerie complet avec fonctionnalités avancées
   - Utilise un AppKey au format `orgName#appName`
   - WebSocket: `msync-api-41.chat.agora.io`
   - REST API: `a41.chat.agora.io`

2. **RTM SDK** (utilisé dans cette app)
   - SDK léger pour la synchronisation en temps réel
   - Utilise généralement le même App ID que RTC
   - Utilisé pour synchroniser les membres, les attributs utilisateur, etc.

## 🔧 Configuration actuelle

Dans cette application, nous utilisons :

- **RTC App ID**: `ea7f8444db754db0b406c2374270ad88` (pour l'audio/vidéo)
- **RTM App ID**: `ea7f8444db754db0b406c2374270ad88` (même que RTC)

## 💡 Si vous voulez utiliser le Chat Service

Si vous souhaitez utiliser le **Chat Service** au lieu de RTM :

1. Installez le SDK Chat d'Agora :
   ```bash
   npm install agora-chat
   ```

2. Utilisez l'AppKey fourni : `411422168#1622987`

3. Configurez la connexion avec les endpoints fournis

## 📝 Note

Pour l'instant, l'application utilise RTM avec le même App ID que RTC. Si vous avez besoin d'intégrer le Chat Service, cela nécessiterait des modifications supplémentaires dans le code.

