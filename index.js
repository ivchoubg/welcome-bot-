const express = require('express');
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

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

  client.user.setPresence({
    activities: [{ name: 'Helping Ivchouu_', type: 0 }],
    status: 'online'
  });
});

client.on('guildMemberAdd', async (member) => {
  const channel = member.guild.channels.cache.get(process.env.CHANNEL_ID);
  if (!channel) return;

  const canvas = createCanvas(900, 300);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2b2140';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = '#6f3cff';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

  const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));

  ctx.save();
  ctx.beginPath();
  ctx.arc(150, 145, 85, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, 65, 60, 170, 170);
  ctx.restore();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(150, 145, 88, 0, Math.PI * 2, true);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(member.user.username, 290, 125);

  ctx.fillStyle = '#dddddd';
  ctx.font = '32px Arial';
  ctx.fillText("Welcome to Ivchou's Community!", 290, 180);

  ctx.fillStyle = '#ffffff';
  ctx.font = '26px Arial';
  ctx.fillText(`Member ${member.guild.memberCount}`, 290, 225);

  const attachment = new AttachmentBuilder(await canvas.encode('png'), {
    name: 'welcome.png'
  });

  await channel.send({
    content: `🎉 **Добре дошъл/ла, ${member}, в Ivchou's Community!**
**Влез и се забавлявай с нас. Ти си ${member.guild.memberCount}-ят член на сървъра! 🔥**
**За да имаш достъп до всички канали погледни <#1504460243441029203> !**`,
    files: [attachment]
  });
});

client.login(process.env.TOKEN);
