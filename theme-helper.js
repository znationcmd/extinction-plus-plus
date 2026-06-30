function getGuildTheme(db, guildId) {
  const theme = db.guilds?.[guildId]?.theme || {};
  return {
    serverName: theme.serverName || 'Extinction++ RSS',
    logoUrl: theme.logoUrl || '/extinction-logo.png',
    bannerUrl: theme.bannerUrl || '/extinction-banner.png',
    primaryColor: theme.primaryColor || '#b91c1c',
    secondaryColor: theme.secondaryColor || '#ef4444',
    buttonColor: theme.buttonColor || '#b91c1c',
    embedColor: theme.embedColor || '#ef4444',
    backgroundColor: theme.backgroundColor || '#08111f'
  };
}
function hexToInt(hex) {
  return parseInt(String(hex || '#00ff99').replace('#', ''), 16);
}
module.exports = { getGuildTheme, hexToInt };
