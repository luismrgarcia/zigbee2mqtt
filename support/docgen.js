/**
 * This script generates the supported devices page.
 * Run by executing: npm run docs
 */

const deviceMapping = require('zigbee-shepherd-converters').devices;
const fs = require('fs');
const YAML = require('json2yaml');
const homeassistant = require('../lib/homeassistant');

const outputdir = process.argv[2];

if (!outputdir) {
    console.error("Please specify an output directory");
}

let file = 'Supported-devices.md';
let text = '*NOTE: Automatically generated by `npm run docgen`*\n';
text += `
In case you own a Zigbee device which is **NOT** listed here, please see [How to support new devices](https://github.com/Koenkk/zigbee2mqtt/wiki/How-to-support-new-devices).
\n`;

const logDevices = (devices) => {
    let result = '';
    result += '| Model | Description | Picture |\n';
    result += '| ------------- | ------------- | -------------------------- |\n';
    devices = new Map(devices.map((d) => [d.model, d]));
    devices.forEach((device) => {
        const pathFriendly = device.model.replace(new RegExp("/", "g"), '-').replace(new RegExp(":", "g"), '-').replace(new RegExp(" ", "g"), '-');
        result += `| ${device.model} | ${device.vendor} ${device.description} (${device.supports}) | ![${pathFriendly}](images/devices/${pathFriendly}.jpg) |\n`;
    });

    return result;
}

const vendors = Array.from(new Set(deviceMapping.map((d) => d.vendor)));
vendors.sort();
vendors.forEach((vendor) => {
    text += `### ${vendor}\n`;
    text += logDevices(deviceMapping.filter((d) => d.vendor === vendor));
    text += '\n';
})

fs.writeFileSync(outputdir + '/' + file, text);


file = 'Integrating-with-Home-Assistant.md';
text = '*NOTE: Automatically generated by `npm run docgen`*\n\n';
text += 'If you\'re hosting zigbee2mqtt using [this hassio addon-on](https://github.com/danielwelch/hassio-zigbee2mqtt) use their documentation on how to configure.\n\n'
text += 'The easiest way to integrate zigbee2mqtt with Home Assistant is by using [MQTT discovery](https://www.home-assistant.io/docs/mqtt/discovery/).\n\n'
text += 'To achieve the best possible integration (including MQTT discovery):\n';
text += '- In your **zigbee2mqtt** `configuration.yaml` set `homeassistant: true`\n'
text += '- In your **Home Assistant** `configuration.yaml`:\n';

text += '```yaml\n';
text += 'mqtt:\n';
text += '  discovery: true\n';
text += '  broker: [YOUR MQTT BROKER]  # Remove if you want to use builtin-in MQTT broker\n';
text += '  birth_message:\n';
text += `    topic: 'hass/status'\n`;
text += `    payload: 'online'\n`;
text += '  will_message:\n';
text += `    topic: 'hass/status'\n`;
text += `    payload: 'offline'\n`;
text += '```';
text += '\n\n'

text += 'Zigbee2mqtt is expecting Home Assistant to send it\'s birth/will messages to `hass/status`.'
text += 'Be sure to add this to your `configuration.yaml` if you want zigbee2mqtt to resend the cached values when Home Assistant restarts'
text += '\n\n'

text += 'To respond to button clicks (e.g. WXKG01LM) you can use the following Home Assistant configuration:\n'
text += '```yaml'
text += `
automation:
  - alias: Respond to button clicks
    trigger:
      platform: mqtt
      topic: 'zigbee2mqtt/<FRIENDLY_NAME'
    condition:
      condition: template
      value_template: "{{ 'single' == trigger.payload_json.click }}"
    action:
      entity_id: light.bedroom
      service: light.toggle
`
text += '```\n'
text += '**When changing a `friendly_name` for a device you first have to start zigbee2mqtt and after that restart Home Assistant in order to discover the new device ID.**\n\n';
text += 'In case you **dont** want to use Home Assistant MQTT discovery you can use the configuration below.\n\n'

const homeassistantConfig = (device) => {
    const payload = {
        platform: 'mqtt',
        state_topic: "zigbee2mqtt/<FRIENDLY_NAME>",
        availability_topic: "zigbee2mqtt/bridge/state",
        ...device.discovery_payload,
    };

    if (payload.command_topic) {
        if (payload.command_topic_prefix) {
            payload.command_topic = `zigbee2mqtt/<FRIENDLY_NAME>/${payload.command_topic_prefix}/set`;
        } else {
            payload.command_topic = `zigbee2mqtt/<FRIENDLY_NAME>/set`;
        }
    }

    delete payload.command_topic_prefix;

    let yml = YAML.stringify([payload]);
    yml = yml.replace(/(-) \n    /g, '- ');
    yml = yml.replace('---', `${device.type}:`)
    return yml;
}

deviceMapping.forEach((device) => {
    text += `### ${device.model}\n`;
    text += '```yaml\n'

    const configurations = homeassistant.mapping[device.model]
    configurations.forEach((d, i) => {
        text += homeassistantConfig(d);
        if (configurations.length > 1 && i < configurations.length - 1) {
            text += '\n';
        }
    })

    text += '```\n\n';
});

fs.writeFileSync(outputdir + '/' + file, text);
