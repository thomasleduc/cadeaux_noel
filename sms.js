const fetch = require('node-fetch');

require('dotenv').config();

const sms_agent = {
  key: process.env.NEXMO_KEY,
  secret: process.env.NEXMO_SECRET,
};

module.exports = phones => (giver, receiver) => {
    const phone = phones.find(phone => phone.id === giver.id);
    const data = {
      api_key: sms_agent.key,
      api_secret: sms_agent.secret,
      to: phone.number,
      from: 'Santa Berry',
      // prettier-ignore
      text: phone.indirect
        ? `Salut c'est encore le père Noel pour les petits cadeaux, je peux te charger d'une mission ? Il faut que tu dises à ${giver.name} qu'il doit faire un cadeau à ${receiver.name}.`
        : `Salut ${giver.name.split(' ')[0]}, la mère Noel s'est trompée, tu devras offrir un cadeau à ${receiver.name} de maximum 10 euros. Bonne chance.`
    };

    fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(json => console.log(json));
};
