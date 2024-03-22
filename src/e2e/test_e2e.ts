import { ThermostatDevice } from '../lib/thermostat';
import { delay } from '../lib/promices';
import { Logging } from 'homebridge';

const logger = {
  info: (...args) => {
    console.log(JSON.stringify(args));
  },
  debug: (...args) => {
    console.log(JSON.stringify(args));
  },
  warn: (...args) => {
    console.log(JSON.stringify(args));
  },
  error: (...args) => {
    console.log(JSON.stringify(args));
  },
  log: (...args) => {
    console.log(JSON.stringify(args));
  },
};

const deviceE2E = async () => {
  const device = new ThermostatDevice(
    'bfd90972993fe55141yayf',
    '^d)o~QNbcT[n7T$s',
    logger as Logging,
  );

  await device.update();

  await delay(100, 0);
  console.log(`CONNECTED: ${device.isConnected()}`);
  console.log(`POWER ON: ${await device.isOn()}`);
  await delay(100, 0);

  console.log('SET POWER ON.');
  await device.turnOn();
  await delay(100, 0);
  console.log(`POWER ON: ${await device.isOn()}`);


  console.log('SET POWER OFF..');
  await device.turnOff();
  await delay(100, 0);
  console.log(`POWER ON: ${await device.isOn()}`);

  await device.setCurrentTemp(20);
  await device.setTargetTemp(22);
  await delay(100, 0);
  console.log(`POWER ON: ${await device.isOn()}`);
  await device.stop();

};

// Create a new async function (a new scope) and immediately call it!
(async () => {
  await deviceE2E();
})();