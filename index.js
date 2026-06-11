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

    const image = new Jimp(900, 300, 0x1b102bff);

    // Main card
    drawRect(image, 25, 25, 850, 250, 0x8c52ffff, 6);
    drawRect(image, 42, 42, 816, 216, 0x3b225fff, 2);

    // Avatar
    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await Jimp.read(avatarUrl);
    avatar.resize(150, 150);
    makeCircle(avatar);

    const avatarBg = new Jimp(172, 172, 0x8c52ffff);
    makeCircle(avatarBg);

    const avatarInner = new Jimp(160, 160, 0x111111ff);
    makeCircle(avatarInner);

    image.composite(avatarBg, 75, 64);
    image.composite(avatarInner, 81, 70);
    image.composite(avatar, 86, 75);

    // Fonts
    const fontBig = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);

    // Text - spaced better
    image.print(fontBig, 300, 55, 'Welcome to', 540);
    image.print(fontMedium, 305, 135, member.guild.name, 520);
    image.print(fontMedium, 305, 195, `Member ${member.guild.memberCount}`, 520);
    image.print(fontSmall, 730, 247, 'Ivcho-Welcomer', 130);

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
