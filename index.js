const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
app.get('/', (req, res) => res.send('Bot is alive'));
app.listen(process.env.PORT || 3000, () => console.log('Web server running'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.channels.cache.get(process.env.CHANNEL_ID);
  if (!channel) return;

  channel.send(`🎉 **Добре дошъл/ла, ${member}, в Ivchou's Community!**

Влез и се забавлявай с нас. Ти си **${member.guild.memberCount}-ят член** на сървъра! 🔥
За да имаш достъп до всички канали погледни <#1504460243441029203> !`);
});

client.login(process.env.TOKEN);
