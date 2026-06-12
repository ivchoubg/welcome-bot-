const express = require('express');
const fs = require('fs');
const Jimp = require('jimp');
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

function drawRect(img, x, y, w, h, color, thickness = 4) {
  for (let i = 0; i < thickness; i++) {
    for (let xx = x; xx < x + w; xx++) {
      img.setPixelColor(color, xx, y + i);
      img.setPixelColor(color, xx, y + h - 1 - i);
    }
    for (let yy = y; yy < y + h; yy++) {
      img.setPixelColor(color, x + i, yy);
      img.setPixelColor(color, x + w - 1 - i, yy);
    }
  }
}

function makeCircle(img) {
  const w = img.bitmap.width;
  const h = img.bitmap.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;

  img.scan(0, 0, w, h, function (x, y, idx) {
    const dx = x - cx;
    const dy = y - cy;
    if (Math.sqrt(dx * dx + dy * dy) > r) {
      this.bitmap.data[idx + 3] = 0;
    }
  });

  return img;
}

async function getNameFont(username) {
  if (username.length <= 18) return Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
  return Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
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

    const image = new Jimp(900, 300, 0x241b35ff);

    drawRect(image, 18, 18, 864, 264, 0x4b2a80ff, 10);
    drawRect(image, 28, 28, 844, 244, 0x8c52ffff, 5);

    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await Jimp.read(avatarUrl);
    avatar.resize(150, 150);
    makeCircle(avatar);

    const whiteCircle = new Jimp(176, 176, 0xffffffff);
    makeCircle(whiteCircle);

    const darkCircle = new Jimp(162, 162, 0x241b35ff);
    makeCircle(darkCircle);

    image.composite(whiteCircle, 52, 62);
    image.composite(darkCircle, 59, 69);
    image.composite(avatar, 65, 75);

    const username = member.user.username;
    const serverName = member.guild.name;
    const memberCount = member.guild.memberCount;

    const fontName = await getNameFont(username);
    const fontText = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    image.print(fontName, 250, 58, username, 610);
    image.print(fontText, 250, 130, `Welcome to ${serverName}!`, 610);
    image.print(fontText, 250, 178, `Member ${memberCount}`, 610);

    drawRect(image, 250, 228, 280, 3, 0x8c52ffff, 3);

    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);

    const attachment = new AttachmentBuilder(buffer, {
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
