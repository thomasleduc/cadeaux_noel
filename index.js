const fs = require('fs');
const config = require('config');
const giftRandomer = require('./gifts');
const sendSms = require('./sms');

const participants = config.get('phones');
const notCompatibles = config.get('notCompatibles');

// sanity check of config : no double id in participants
if (new Set(participants.map(({ id }) => id)).size !== participants.length) {
  throw new Error('Double ids in participants list');
}

const gifts = giftRandomer(participants, notCompatibles);

fs.writeFile(
  `./dist/${Math.floor(Date.now() / 1000)}_result.txt`,
  JSON.stringify(gifts, null, 2),
  () => {
    console.log('The drawing lots is done');
  },
);

gifts.forEach(({ giver, receiver }) => sendSms(giver, receiver));
