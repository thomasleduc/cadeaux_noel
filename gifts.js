// waiting for flat to arrive on node.
Array.prototype.flat = function() {
  return this.reduce((acc, val) => acc.concat(val), []);
};

module.exports = (participants, notCompatibles) => {
  // --------
  // helper functions
  // --------
  const toExclude = giver =>
    notCompatibles.filter(notCompatible => notCompatible.includes(giver)).flat();

  const randomIndex = (length, minIndex = 0) => Math.floor(Math.random() * length) + minIndex;

  const pickRandomly = arr => arr[randomIndex(arr.length)];

  const pickRandomlyWithException = (arr, exceptedValues) => {
    const arrWithoutException = arr.filter(el => !exceptedValues.includes(el));
    return pickRandomly(arrWithoutException);
  };

  //---------
  // process
  //---------
  let receivers = participants.map(participant => participant.name);

  return participants.map(giver => {
    // pick in left receivers except the current giver
    const receiver = pickRandomlyWithException(receivers, [...toExclude(giver.name), giver.name]);

    // remove receiver from the left receivers
    receivers = receivers.filter(el => el !== receiver);

    // return the couple giver/receiver
    return { giver, receiver };
  });
};
