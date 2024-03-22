import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { Device, TuyaHomebridgePlatform } from './platform';
import { ThermostatDevice } from './lib/thermostat';

export class TuyaThermostatAccessory {
  private service: Service;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private thermostat: ThermostatDevice;
  private device: Device;

  constructor(
    private readonly platform: TuyaHomebridgePlatform,
    private readonly accessory: PlatformAccessory,
  ) {
    this.device = accessory.context.device as Device;

    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Tuya')
      .setCharacteristic(this.platform.Characteristic.Model, 'ProWarm Wi-Fi')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        this.device.id,
      );

    this.service =
      this.accessory.getService(this.platform.Service.Thermostat) ||
      this.accessory.addService(this.platform.Service.Thermostat);

    this.thermostat = new ThermostatDevice(
      this.device.id,
      this.device.key,
      this.platform.log,
    );

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.service.setCharacteristic(
      this.platform.Characteristic.Name,
      this.device.name,
    );

    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .onGet(this.getActive.bind(this))
      .onSet(this.setActive.bind(this));

    this.service
      .getCharacteristic(
        this.platform.Characteristic.CurrentHeatingCoolingState,
      )
      .onGet(this.getCurrentHeatingCoolingState.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetHeatingCoolingState)
      .onGet(this.getTargetHeatingCoolingState.bind(this))
      .onSet(this.setTargetHeatingCoolingState.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getCurrentTemperature.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TargetTemperature)
      .onGet(this.getTargetTemperature.bind(this))
      .onSet(this.setTargetTemperature.bind(this));

    this.service
      .getCharacteristic(this.platform.Characteristic.TemperatureDisplayUnits)
      .onGet(this.getTemperatureDisplayUnits.bind(this))
      .onSet(this.setTemperatureDisplayUnits.bind(this));

    // Assume we'll get kicked off or have to sync manual changes on the thermostat
    setInterval(async () => {
      try {
        await this.thermostat.update();
        this.device.state = this.thermostat.isOn();

        this.platform.log.debug('device synced', { dev: this.device });

        if (this.device.disableAfterSeconds === undefined) {
          return;
        }

        if (this.device.heatingSince === undefined) {
          if (this.device.state) {
            this.device.heatingSince = Date.now();
          }

          return;
        }

        // interval in MS / 1000 for seconds
        const elapsed = (Date.now() - this.device.heatingSince) / 1000;

        if (elapsed < this.device.disableAfterSeconds) {
          return;
        }

        await this.thermostat.turnOff();
        this.device.heatingSince = undefined;
      } catch (error) {
        this.platform.log.warn('error in device reconnect attempt', { error });
      }
    }, 5000);
  }

  private getActive() {
    if (this.thermostat.isOn()) {
      return this.platform.Characteristic.Active.ACTIVE;
    } else {
      return this.platform.Characteristic.Active.INACTIVE;
    }
  }

  private async setActive(value: CharacteristicValue) {
    if (value) {
      await this.thermostat.turnOn();
    } else {
      await this.thermostat.turnOff();
    }
  }

  async getCurrentHeatingCoolingState(): Promise<CharacteristicValue> {
    if (this.thermostat.isWarming()) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
    }

    return this.platform.Characteristic.TargetHeatingCoolingState.OFF;
  }

  async getTargetHeatingCoolingState(): Promise<CharacteristicValue> {
    if (this.device.state) {
      return this.platform.Characteristic.CurrentHeatingCoolingState.HEAT;
    }

    return this.platform.Characteristic.CurrentHeatingCoolingState.OFF;
  }

  async setTargetHeatingCoolingState(value: CharacteristicValue) {
    if (
      value !== this.platform.Characteristic.CurrentHeatingCoolingState.HEAT
    ) {
      await this.thermostat.turnOff();
    } else {
      await this.thermostat.turnOn();
      if (
        this.device.currentTemp &&
        this.device.targetTemp < this.device.currentTemp
      ) {
        this.thermostat.setTargetTemp(this.thermostat.getCurrentTemp() + 1);
        this.device.targetTemp = this.thermostat.getTargetTemp();
      }
    }

    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .updateValue(this.thermostat.isWarming());
  }

  async getCurrentTemperature(): Promise<CharacteristicValue> {
    return this.device.currentTemp;
  }

  async getTargetTemperature(): Promise<CharacteristicValue> {
    return this.device.targetTemp;
  }

  async setTargetTemperature(value: CharacteristicValue) {
    await this.thermostat.setTargetTemp(value as number);
    this.device.targetTemp = this.thermostat.getTargetTemp();
  }

  async setCurrentTemperature(value: number) {
    await this.thermostat.setCurrentTemp(value);
    device.currentTemp = value;

    this.service
      .getCharacteristic(this.platform.Characteristic.Active)
      .updateValue(this.thermostat.isWarming());
  }

  async getTemperatureDisplayUnits(): Promise<CharacteristicValue> {
    return this.platform.Characteristic.TemperatureDisplayUnits.CELSIUS;
  }

  async setTemperatureDisplayUnits(value: CharacteristicValue) {
    this.platform.log.debug('setTemperatureDisplayUnits ->', value);
  }

  public getDeviceId(): string {
    return this.device.id;
  }
}
