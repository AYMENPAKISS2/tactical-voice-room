import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const AgoraToken = require('agora-token');

console.log('AgoraToken keys:', Object.keys(AgoraToken));
// console.log('Full AgoraToken:', AgoraToken); 

const { RtmTokenBuilder } = AgoraToken;

// Try to find RtmRole or use constant
const RtmRole = AgoraToken.RtmRole || { Rtm_User: 1 };
console.log('Using RtmRole:', RtmRole);

const appId = 'ea7f8444db754db0b406c2374270ad88';
const appCertificate = '4e7d29b89326451886bafd22746ec118';
const uid = '1234';
const expiration = 3600;
const currentTimestamp = Math.floor(Date.now() / 1000);
const privilegeExpiredTs = currentTimestamp + expiration;

try {
    console.log('Attempting to build token with role 1...');
    const token = RtmTokenBuilder.buildToken(appId, appCertificate, uid, 1, privilegeExpiredTs);
    console.log('Generated Token:', token);
} catch (e) {
    console.error('Error generating token:', e);
}
