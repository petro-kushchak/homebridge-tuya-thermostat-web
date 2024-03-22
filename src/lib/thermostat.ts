import { Logger } from 'homebridge';
import TuyAPI from 'tuyapi';

export class ThermostatDevice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private device: any;

  private state = false;

  private targetTemp = 10;

  private currentTemp = 0;

  private refreshInterval: any;

  constructor(
    private readonly deviceId: string,
    private readonly deviceKey: string,
    private readonly log: Logger,
  ) {
    this.device = new TuyAPI({
      id: this.deviceId,
      key: this.deviceKey,
      issueGetOnConnect: false,
      version: 3.4,
    });

    this.device.on('data', (data) => {
      this.state = data.dps['1'];
    });

    this.device.on('error', (err) =>
      this.log.warn('device connection error', { err }),
    );
  }

  public stop(): void {
    this.log.info('STOP');
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  public async update(): Promise<void> {
    if (!this.isConnected()) {
      await this.device.find();
      await this.device.connect();

      this.refreshInterval = setInterval(async () => {
        await this.device.get({ schema: true });
      }, 100);
    }
  }

  public getState(): boolean {
    return this.state;
  }

  public getTargetTemp(): number {
    return this.targetTemp;
  }

  public async setTargetTemp(value: number) {
    this.log.info(`SET TARGET TEMP: ${value}`);
    this.targetTemp = value;

    if (this.currentTemp < this.targetTemp) {
      await this.turnOn();
    } else {
      await this.turnOff();
    }
  }

  public getCurrentTemp(): number {
    return this.currentTemp;
  }

  public async setCurrentTemp(value: number) {
    this.log.info(`SET CURRENT TEMP: ${value}`);

    this.currentTemp = value;

    if (this.currentTemp < this.targetTemp) {
      await this.turnOn();
    } else {
      await this.turnOff();
    }
  }

  public isConnected(): boolean {
    return this.device.isConnected();
  }

  public isOn(): boolean {
    return this.state;
  }

  public async turnOn(): Promise<void> {
    this.log.info('POWER: on');
    await this.update();
    await this.device.set({ set: true, dps: '1' });
  }

  public async turnOff(): Promise<void> {
    this.log.info('POWER: off');
    await this.update();
    await this.device.set({ set: false, dps: '1' });
  }

  public isWarming(): boolean {
    return this.isOn() && (this.currentTemp < this.targetTemp);
  }
}
