module.exports = {
  DISCORD_TOKEN: process.env.DISCORD_TOKEN || process.env.TOKEN || "",
  CLIENT_ID: process.env.CLIENT_ID || "",
  GUILD_ID: process.env.GUILD_ID || "",
  OWNER_ID: process.env.OWNER_ID || "",

  DATABASE_PATH: process.env.DATABASE_PATH || "./shared/database.json",

  DASHBOARD_URL: process.env.DASHBOARD_URL || (
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "http://localhost:3000"
  ),

  SHOP_URL: process.env.SHOP_URL || (
    (process.env.DASHBOARD_URL || (
      process.env.RAILWAY_PUBLIC_DOMAIN
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : "http://localhost:3000"
    )) + "/shop"
  ),

  PUBLIC_BOT_MODE: true,
  FREE_FOR_ALL: true,

  ADMIN_ROLE_ID: process.env.ADMIN_ROLE_ID || "",
  NITRADO_TOKEN: process.env.NITRADO_TOKEN || "",
  CLIENT_SECRET: process.env.CLIENT_SECRET || "",

  ARK_SERVERS: {
    amissa: {
      name: "Valhalla Extinction - Amissa",
      map: "Amissa_WP",
      host: process.env.AMISSA_HOST,
      gamePort: Number(process.env.AMISSA_GAME_PORT || 0),
      rconPort: Number(process.env.AMISSA_RCON_PORT || 0),
      password: process.env.AMISSA_RCON_PASSWORD || ""
    },
    astraeos: {
      name: "Valhalla Extinction - Astraeos",
      map: "Astraeos_WP",
      host: process.env.ASTRAEOS_HOST,
      gamePort: Number(process.env.ASTRAEOS_GAME_PORT || 0),
      rconPort: Number(process.env.ASTRAEOS_RCON_PORT || 0),
      password: process.env.ASTRAEOS_RCON_PASSWORD || ""
    }
  }
};
