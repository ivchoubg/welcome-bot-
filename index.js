const express = require('express');
const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionFlagsBits,
  AttachmentBuilder
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(process.env.PORT || 3000, () => console.log('Web server running'));

const SETTINGS_FILE = './welcomeChannels.json';

function loadSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) return {};
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

let welcomeChannels = loadSettings();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    await client.application.commands.set([
      new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Setup bot systems')
        .addSubcommand(sub =>
          sub.setName('welcome').setDescription('Set this channel as the welcome channel')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .toJSON()
    ]);
    console.log('Slash commands registered.');
  } catch (err) {
    console.error('Slash command register error:', err);
  }

  client.user.setPresence({
    activities: [{ name: 'Helping Ivchouu_', type: 0 }],
    status: 'online'
  });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'setup' && interaction.options.getSubcommand() === 'welcome') {
    welcomeChannels[interaction.guildId] = interaction.channelId;
    saveSettings(welcomeChannels);

    await interaction.reply({
      content: `✅ Welcome системата е настроена за <#${interaction.channelId}>.`,
      ephemeral: true
    });
  }
});

client.on('guildMemberAdd', async (member) => {
  try {
    const channelId = welcomeChannels[member.guild.id];
    if (!channelId) return;

    const channel = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const canvas = createCanvas(900, 300);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#2b2140';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#6f3cff';
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);

    const avatar = await loadImage(
      member.user.displayAvatarURL({ extension: 'png', size: 256 })
    );

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
    ctx.fillText(`Welcome to ${member.guild.name}!`, 290, 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = '26px Arial';
    ctx.fillText(`Member ${member.guild.memberCount}`, 290, 225);

    const attachment = new AttachmentBuilder(await canvas.encode('png'), {
      name: 'welcome.png'
    });

    await channel.send({
      content: `🎉 **Добре дошъл/ла, ${member}, в ${member.guild.name}!**\n**Влез и се забавлявай с нас. Ти си ${member.guild.memberCount}-ят член на сървъра! 🔥**`,
      files: [attachment]
    });

    console.log('Welcome message sent.');
  } catch (err) {
    console.error('Welcome error:', err);
  }
});

client.login(process.env.TOKEN);
