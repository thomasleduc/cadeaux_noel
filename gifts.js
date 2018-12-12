// waiting for flat to arrive on node.
Array.prototype.flat = function() {
  return this.reduce((acc, val) => acc.concat(val), []);
};

const randomIndex = (length, minIndex = 0) => Math.floor(Math.random() * length) + minIndex;

const pickRandomly = arr => arr[randomIndex(arr.length)];

module.exports = (participants, notCompatibles) => {
  // --------
  // helper functions
  // --------

  // return ids of exceptions
  const toExclude = giverId =>
    notCompatibles.filter(notCompatible => notCompatible.includes(giverId)).flat();

  // pick randomly a person but not in exceptedValues
  const pickRandomlyWithException = (particips, exceptedValues) => {
    const arrWithoutExceptions = particips.filter(({id}) => !exceptedValues.includes(id));
    return pickRandomly(arrWithoutExceptions);
  };

  //---------
  // process
  //---------

  let receivers = [...participants];

  return participants.map(giver => {
    // pick in left receivers except the current giver
    const receiver = pickRandomlyWithException(receivers, [...toExclude(giver.id), giver.id]);

    // remove receiver from the left receivers
    receivers = receivers.filter(({id}) => id !== receiver.id);

    // return the couple giver(object)/receiver(object)
    return { giver, receiver };
  });
};
