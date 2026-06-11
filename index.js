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

    const image = new Jimp(900, 300, 0x241b35ff);

    drawRect(image, 15, 15, 870, 270, 0x7b3cffff, 6);

    const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await Jimp.read(avatarUrl);
    avatar.resize(170, 170);

    drawRect(image, 62, 57, 186, 186, 0x8c52ffff, 8);
    image.composite(avatar, 70, 65);

    const fontBig = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
    const fontMedium = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    image.print(fontBig, 300, 55, 'Welcome to', 560);
    image.print(fontMedium, 300, 135, member.guild.name, 560);
    image.print(fontMedium, 300, 205, `Member ${member.guild.memberCount}`, 560);

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
