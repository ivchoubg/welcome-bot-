const express = require('express');
const fs = require('fs');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionFlagsBits,
  AttachmentBuilder
} = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 'DejaVuSansBold');
GlobalFonts.registerFromPath('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'DejaVuSans');

const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));

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
          sub
            .setName('welcome')
            .setDescription('Set this channel as the welcome channel')
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

  if (
    interaction.commandName === 'setup' &&
    interaction.options.getSubcommand() === 'welcome'
  ) {
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

    ctx.fillStyle = '#241b35';
    ctx.fillRect(0, 0, 900, 300);

    ctx.strokeStyle = '#7b3cff';
    ctx.lineWidth = 6;
    ctx.strokeRect(15, 15, 870, 270);

    const avatar = await loadImage(
      member.user.displayAvatarURL({ extension: 'png', size: 256 })
    );

    ctx.save();
    ctx.beginPath();
    ctx.arc(155, 150, 85, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 70, 65, 170, 170);
    ctx.restore();

    ctx.strokeStyle = '#8c52ff';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(155, 150, 88, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textBaseline = 'top';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.fillText('Welcome to', 300, 70);

    ctx.fillStyle = '#8c52ff';
    ctx.font = 'bold 44px Arial';
    ctx.fillText(member.guild.name, 300, 135, 560);

    ctx.fillStyle = '#dddddd';
    ctx.font = '34px Arial';
    ctx.fillText(`Member ${member.guild.memberCount}`, 300, 205);

    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), {
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

app.listen(process.env.PORT || 3000, () => {
  console.log('Web server running');
});

client.login(process.env.TOKEN);
