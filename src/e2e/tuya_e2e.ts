const TuyAPI = require('tuyapi');

const device = new TuyAPI({
  id:  'bfd90972993fe55141yayf',
  key: '^d)o~QNbcT[n7T$s',
  // version: 3.4,
  issueGetOnConnect: true});

(async () => {
  await device.find();

  await device.connect();


  device.on('data', (data) => {
    console.log(`Current status: ${JSON.stringify(data)}.`);
  });

  let status = await device.get({schema: true});

  console.log(`Current status: ${status}.`);

  await device.set({set: !status});

  status = await device.get();

  console.log(`New status: ${status}.`);

  device.disconnect();
})();
