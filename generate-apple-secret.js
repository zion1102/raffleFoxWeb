const jwt = require('jsonwebtoken');
const fs = require('fs');

const teamId = 'Y5N3U7CU4N'; // Replace with your Apple Developer Team ID
const keyId = 'K7QDF33UA5'; // Replace with your Key ID
const clientId = 'com.example.raffle-fox.service'; // Replace with your Service ID
const privateKey = fs.readFileSync('/Users/zionhenry/dev_folder/raffleFoxWeb/AuthKey_3VG9HSG4ZZ.p8'); // Replace with the path to your downloaded .p8 file

const token = jwt.sign(
  {
    iss: teamId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 * 24, // Expires in 24 hours
    aud: 'https://appleid.apple.com',
    sub: clientId,
  },
  privateKey,
  {
    algorithm: 'ES256',
    keyid: keyId,
  }
);

console.log('Generated Apple Client Secret:', token);
