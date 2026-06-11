const express = require('express');
const fs = require('fs');
const sharp = require('sharp');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionFlagsBits,
  AttachmentBuilder
} = require('discord.js');

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

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function imageToBase64(url) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString('base64');
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

    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarBase64 = await imageToBase64(avatarUrl);

    const serverName = escapeXml(member.guild.name);
    const memberCount = member.guild.memberCount;

    const svg = `
      <svg width="900" height="300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <clipPath id="avatarClip">
            <circle cx="155" cy="150" r="85"/>
          </clipPath>
        </defs>

        <rect width="900" height="300" fill="#241b35"/>
        <rect x="15" y="15" width="870" height="270" rx="8" fill="none" stroke="#7b3cff" stroke-width="6"/>

        <circle cx="155" cy="150" r="92" fill="#8c52ff"/>
        <circle cx="155" cy="150" r="86" fill="#111111"/>
        <image href="data:image/png;base64,${avatarBase64}" x="70" y="65" width="170" height="170" clip-path="url(#avatarClip)"/>

        <text x="300" y="105" font-family="DejaVu Sans" font-size="52" font-weight="700" fill="#ffffff">Welcome to</text>
        <text x="300" y="165" font-family="DejaVu Sans" font-size="42" font-weight="700" fill="#8c52ff">${serverName}</text>
        <text x="300" y="220" font-family="DejaVu Sans" font-size="34" fill="#dddddd">Member ${memberCount}</text>
      </svg>
    `;

    const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const attachment = new AttachmentBuilder(imageBuffer, {
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
