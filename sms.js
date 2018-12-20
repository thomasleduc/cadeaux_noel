const fetch = require('node-fetch');

require('dotenv').config();

const sms_agent = {
  key: process.env.NEXMO_KEY,
  secret: process.env.NEXMO_SECRET,
};

module.exports = (giver, receiver) => {
  const data = {
    api_key: sms_agent.key,
    api_secret: sms_agent.secret,
    to: giver.number,
    from: 'Santa Brunoy',
    // prettier-ignore
    text: giver.indirect
        ? `Salut c'est le père Noel pour le santa Brunoy, je peux te charger d'une mission ? Il faut que tu dises à ${giver.name} qu'il doit faire un cadeau à ${receiver.name}.`
        : `Bonjour ${giver.name.split(' ')[0]}, c'est le père Noel pour le santa Brunoy, tu devras offrir un cadeau à ${receiver.name} de maximum 15-20 euros. Bonne chance.`
  };

  fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  })
    .then(res => res.json())
    .then(json => console.log(json));
};
