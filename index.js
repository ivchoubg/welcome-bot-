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

  await client.application.commands.set([
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Setup bot systems')
      .addSubcommand(sub =>
        sub.setName('welcome').setDescription('Set this channel as the welcome channel')
      )
      .toJSON()
  ]);
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

    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarBase64 = await imageToBase64(avatarUrl);

    const username = escapeXml(member.user.username);
    const serverName = escapeXml(member.guild.name);
    const memberCount = member.guild.memberCount;

    const svg = `
    <svg width="900" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="avatarClip">
          <circle cx="135" cy="150" r="70"/>
        </clipPath>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <rect width="900" height="300" fill="#241b35"/>
      <rect x="20" y="20" width="860" height="260" rx="6" fill="none" stroke="#7b3cff" stroke-width="6"/>

      <circle cx="135" cy="150" r="82" fill="#ffffff"/>
      <circle cx="135" cy="150" r="76" fill="#241b35"/>
      <image href="data:image/png;base64,${avatarBase64}" x="65" y="80" width="140" height="140" clip-path="url(#avatarClip)"/>

      <text x="250" y="112" font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif"
        font-size="54" font-weight="800" fill="#ffffff" filter="url(#glow)">
        ${username}
      </text>

      <text x="250" y="162" font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif"
        font-size="28" font-weight="500" fill="#ffffff">
        Welcome to ${serverName}!
      </text>

      <text x="250" y="205" font-family="Liberation Sans, DejaVu Sans, Arial, sans-serif"
        font-size="26" font-weight="600" fill="#ffffff">
        Member ${memberCount}
      </text>
    </svg>`;

    const imageBuffer = await sharp(Buffer.from(svg)).png().toBuffer();

    const attachment = new AttachmentBuilder(imageBuffer, {
      name: 'welcome.png'
    });

    await channel.send({
      content: `🎉 **Добре дошъл/ла, ${member}, в ${member.guild.name}!**\n**Влез и се забавлявай с нас. Ти си ${member.guild.memberCount}-ят член на сървъра! 🔥**`,
      files: [attachment]
    });
  } catch (err) {
    console.error('Welcome error:', err);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Web server running');
});

client.login(process.env.TOKEN);
