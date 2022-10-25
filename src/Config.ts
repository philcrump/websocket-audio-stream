// @filename: Config.ts

const ConfigReader = async (config_filename='config.json') => {
  try {
    const config_json = await Deno.readTextFile(config_filename)
    const config = JSON.parse(config_json);
    console.info(`Loaded configuration from ${config_filename}`);
    return config;
  }
  catch (err) {
    console.error(`Failed to load config file from ${config_filename}`);
    Deno.exit(1);
  }
}

export default ConfigReader;