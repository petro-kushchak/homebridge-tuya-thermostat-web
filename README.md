<p align="center">

<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

# Homebridge Tuya Thermostat with Web Hooks

This project is to be used with Tuya-compatible dry contact relay. This uses TuyAPI under the hood and will need [device ID and key](https://github.com/codetheweb/tuyapi/blob/master/docs/SETUP.md) to be populated in the config beforehand.



## Thermostat room temperature
Thermostat will display room temperature based on web hook input.

## Endpoint for Thermostat temperature
This plugin supports temperature updates from http web hook. You can enable HomeKit automation to send room temperature sensor information.
Once plugin is started, it starts http server with port httpPort. Currently plugin supports URL (example with Homebridge Raspberry Pi setup and default httpPort: 4567):
```
GET http://homebridge.localhost:4567/temp/<device-id>/21.5%32%C
```


