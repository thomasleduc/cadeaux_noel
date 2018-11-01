const fetch = require('node-fetch');

require('dotenv').config();

const sms_agent = {
  key: process.env.NEXMO_KEY,
  secret: process.env.NEXMO_SECRET,
};

module.exports = phones => {
  const getPhone = id => phones.find(phone => phone.id === id);

  return (giver, receiver) => {
    const phone = getPhone(giver.id);
    const data = {
      api_key: sms_agent.key,
      api_secret: sms_agent.secret,
      to: phone.number,
      from: 'Le père Noël',
      // prettier-ignore
      text: phone.indirect
        ? `Salut c'est encore le père Noël pour les petits cadeaux, je peux te charger d'une mission ? Il faut que tu dises à ${giver.name} qu'il doit faire un cadeau à ${receiver}.`
        : `Salut ${giver.name}, c'est le père Noël pour les petits cadeaux, tu devras offrir un cadeau à ${receiver} de maximum 5 euros qui te fasse penser à l'esprit de Noël.`
    };

    fetch('https://rest.nexmo.com/sms/json', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' },
    })
      .then(res => res.json())
      .then(json => console.log(json));
  };
};
