import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge';

import { PLATFORM_NAME, PLUGIN_NAME } from './settings';
import { TuyaThermostatAccessory } from './platformAccessory';
import { AutomationReturn, HttpService } from './lib/services/httpService';

interface DeviceConfig {
  name: string;
  id: string;
  key: string;
  disableAfterSeconds?: number;
}

export interface Device extends DeviceConfig {
  uuid: string;
  state: boolean;
  currentTemp: number;
  targetTemp: number;
  heatingSince?: number;
}

export class TuyaHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];
  private readonly registeredDevices: TuyaThermostatAccessory[] = [];
  private readonly httpService: HttpService;

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      // run the method to discover / register your devices as accessories
      this.discoverDevices();
    });

    const httpPort = this.config.httpPort | 9990;
    this.log.info('Starting http service on port:', httpPort);
    this.httpService = new HttpService(httpPort, this.log);
    this.httpService.start((uri: string) => this.httpHandler(uri));
  }

  /**
   * This function is invoked when homebridge restores cached accessories from disk at startup.
   * It should be used to setup event handlers for characteristics and update respective values.
   */
  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    // add the restored accessory to the accessories cache so we can track if it has already been registered
    this.accessories.push(accessory);
  }

  /**
   * This is an example method showing how to register discovered accessories.
   * Accessories must only be registered once, previously created accessories
   * must not be registered again to prevent "duplicate UUID" errors.
   */
  discoverDevices() {
    const configDevices: DeviceConfig[] = this?.config?.devices;

    const devices = configDevices.map(cd => <Device>{
      ...cd,
      uuid: this.api.hap.uuid.generate(cd.id),
    });

    for (const device of devices) {
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === device.uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);

        existingAccessory.context.device = device;
        this.api.updatePlatformAccessories([existingAccessory]);

        this.registeredDevices.push(new TuyaThermostatAccessory(this, existingAccessory));
        continue;
      }

      this.log.info('Adding new accessory:', device.name);

      const accessory = new this.api.platformAccessory(device.name, device.uuid);

      accessory.context.device = device;

      this.registeredDevices.push(new TuyaThermostatAccessory(this, accessory));
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }


  httpHandler(uri: string): AutomationReturn {
    this.log.info(`Received request: ${uri}`);

    const parts = uri.split('/');

    if (parts.length < 3) {
      return {
        error: true,
        message: 'Malformed uri',
      };
    }

    // update accessory temp value
    // uri example: /temp/<ac-id>/22.5%C2%B0C
    // usually due to HomeKit automation when original uri is /temp/123/22.5C

    if (parts[1] === 'temp') {
      const deviceId = parts[2];
      const device = this.registeredDevices.find((plat) => {
        this.log.info(`registeredDevices: ${plat.getDeviceId()} `);

        return plat.getDeviceId() === deviceId;
      });

      this.log.info(`URL parts: device: ${deviceId} temp: ${parts[3]}`);

      if (!device) {
        this.log.info(`Device id: ${deviceId} not found`);
        return {
          error: false,
          message: `Device id: ${deviceId} not found`,
        };
      }

      const tempParts = parts[3].split('%');
      if (tempParts.length > 0) {
        //replace with "." in case if HomeKit automation sends "," in temperature value
        const temp = '' + tempParts[0].replace(',', '.');
        device?.setCurrentTemperature(Number(temp));

        const message = `Updated accessory ${deviceId} current temperature to: ${temp}`;
        this.log.info(message);
        return {
          error: false,
          message: message,
        };
      }
    }

    return {
      error: false,
      message: 'OK',
    };
  }
}
