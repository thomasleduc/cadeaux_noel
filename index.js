const fs = require('fs');
const config = require('config');
const giftRandomer = require('./gifts');
const sms = require('./sms');

const phones = config.get('phones');

// name : Name of the participant
// number : phone number
// indirect: if the phone number is his or not
const participants = [
  { id: 'nic', name: 'Nicolas' },
  { id: 'mar', name: 'Mariette' },
  { id: 'tho', name: 'Thomas' },
  { id: 'cha', name: 'Charline' },
  { id: 'joj', name: 'Jojo' },
  { id: 'mai', name: 'Marine' },
  { id: 'axe', name: 'Axelle' },
  { id: 'jus', name: 'Justine' },
  { id: 'nat', name: 'Natacha' },
  { id: 'lil', name: 'Lili' },
  { id: 'syl', name: 'Sylvain' },
  { id: 'jul', name: 'Julie' },
  { id: 'chr', name: 'Christophe' },
  { id: 'fec', name: 'Fech' },
  { id: 'had', name: 'Hadrien' },
  { id: 'noe', name: 'Noemie' },
  { id: 'rol', name: 'Roland' },
  { id: 'mpa', name: 'Marie Pascale' },
  { id: 'mat', name: 'Mathieu' },
  { id: 'cle', name: 'Clement' },
  { id: 'flo', name: 'Florent' },
  { id: 'aur', name: 'Aurélie' },
  { id: 'mar', name: 'Margaux' },
  { id: 'cla', name: 'Clara' },
  { id: 'rom', name: 'Romain' },
  { id: 'kat', name: 'Kathy' },
  { id: 'sim', name: 'Simon' },
];

// tuples of incompatibilities
const notCompatibles = [
  ['Nicolas', 'Mariette', 'Thomas', 'Charline'],
  ['Jojo', 'Marine', 'Axelle', 'Justine'],
  ['Sylvain', 'Julie', 'Christophe'],
  ['Fech', 'Hadrien', 'Noemie'],
  ['Marie Pascale', 'Mathieu', 'Clement'],
  ['Florent', 'Aurélie', 'Clara', 'Margaux'],
  ['Romain', 'Kathy', 'Simon'],
];

// sanity check of config : all participants are present
if (participants.some(({ id }) => phones.every(phone => phone.id !== id))) {
  throw new Error("Some participant doesn't have associated id in config files");
}

// sanity check of config : no double id in participants
if (new Set(participants).size !== participants.length) {
  throw new Error('Double ids in participants list');
}

// sanity check of config : no double id in phones
if (new Set(phones).size !== phones.length) {
  throw new Error('Doubles ids in phones list');
}

const gifts = giftRandomer(participants, notCompatibles);

fs.writeFile(
  `./dist/${Math.floor(Date.now() / 1000)}_result.txt`,
  JSON.stringify(gifts, null, 2),
  () => {
    console.log('The drawing lots is done');
  },
);

const sendSms = sms(phones);
gifts.forEach(({ giver, receiver }) => sendSms(giver, receiver));
