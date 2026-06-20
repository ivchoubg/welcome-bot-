const express = require('express');
const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionFlagsBits,
  AttachmentBuilder,
  EmbedBuilder
} = require('discord.js');

const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));

const SETTINGS_FILE = './welcomeChannels.json';
const ALLOWED_GUILD_ID = process.env.ALLOWED_GUILD_ID || null;

const CHANNELS = {
  rules: '1484311851104862360',
  verification: '1504460243441029203',
  roles: '1484308208402174065'
};

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

function fitFontSize(text, maxSize, minSize, maxWidth, factor = 0.56) {
  const size = Math.floor(maxWidth / Math.max(text.length * factor, 1));
  return Math.max(minSize, Math.min(maxSize, size));
}

async function imageToDataUrl(url) {
  const res = await fetch(url);
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

let satoriCache = null;
async function getSatori() {
  if (!satoriCache) {
    satoriCache = (await import('satori')).default;
  }
  return satoriCache;
}

let fontsCache = null;
function getFonts() {
  if (fontsCache) return fontsCache;

  const fontDir = path.join(
    path.dirname(require.resolve('@fontsource/montserrat/package.json')),
    'files'
  );

  fontsCache = [
    {
      name: 'Montserrat',
      data: fs.readFileSync(path.join(fontDir, 'montserrat-latin-800-normal.woff')),
      weight: 800,
      style: 'normal'
    },
    {
      name: 'Montserrat',
      data: fs.readFileSync(path.join(fontDir, 'montserrat-latin-600-normal.woff')),
      weight: 600,
      style: 'normal'
    },
    {
      name: 'Montserrat',
      data: fs.readFileSync(path.join(fontDir, 'montserrat-latin-500-normal.woff')),
      weight: 500,
      style: 'normal'
    }
  ];

  return fontsCache;
}

async function createWelcomeCard(member) {
  const satori = await getSatori();

  const avatarUrl = member.user.displayAvatarURL({ extension: 'png', size: 256 });
  const avatarDataUrl = await imageToDataUrl(avatarUrl);

  const username = member.user.username;
  const serverName = member.guild.name;
  const memberCount = member.guild.memberCount;

  const nameSize = fitFontSize(username, 48, 28, 560, 0.55);
  const welcomeText = `Welcome to ${serverName}!`;
  const welcomeSize = fitFontSize(welcomeText, 30, 21, 560, 0.52);

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '900px',
          height: '300px',
          backgroundColor: '#2b2140',
          border: '5px solid #6f3cff',
          boxSizing: 'border-box',
          position: 'relative',
          display: 'flex',
          fontFamily: 'Montserrat'
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: '55px',
                top: '52px',
                width: '196px',
                height: '196px',
                borderRadius: '999px',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              },
              children: {
                type: 'div',
                props: {
                  style: {
                    width: '176px',
                    height: '176px',
                    borderRadius: '999px',
                    backgroundColor: '#2b2140',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  },
                  children: {
                    type: 'img',
                    props: {
                      src: avatarDataUrl,
                      style: {
                        width: '162px',
                        height: '162px',
                        borderRadius: '999px',
                        objectFit: 'cover'
                      }
                    }
                  }
                }
              }
            }
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                left: '285px',
                top: '72px',
                width: '560px',
                display: 'flex',
                flexDirection: 'column'
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#ffffff',
                      fontSize: `${nameSize}px`,
                      fontWeight: 800,
                      lineHeight: 1.05,
                      letterSpacing: '-0.6px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    },
                    children: username
                  }
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#eeeeee',
                      fontSize: `${welcomeSize}px`,
                      fontWeight: 500,
                      lineHeight: 1.2,
                      marginTop: '12px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden'
                    },
                    children: welcomeText
                  }
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      color: '#ffffff',
                      fontSize: '26px',
                      fontWeight: 600,
                      lineHeight: 1.2,
                      marginTop: '9px'
                    },
                    children: `Member ${memberCount}`
                  }
                }
              ]
            }
          }
        ]
      }
    },
    {
      width: 900,
      height: 300,
      fonts: getFonts()
    }
  );

  const resvg = new Resvg(svg);
  return resvg.render().asPng();
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
    if (ALLOWED_GUILD_ID && interaction.guildId !== ALLOWED_GUILD_ID) {
      await interaction.reply({
        content: '❌ Този бот е private и не може да се настройва в този сървър.',
        ephemeral: true
      });
      return;
    }

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
    if (ALLOWED_GUILD_ID && member.guild.id !== ALLOWED_GUILD_ID) return;

    const channelId = welcomeChannels[member.guild.id];
    if (!channelId) return;

    const channel = await member.guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return;

    const imageBuffer = await createWelcomeCard(member);

    const attachment = new AttachmentBuilder(imageBuffer, {
      name: 'welcome.png'
    });

    const welcomeEmbed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('📌 Започни оттук')
      .setDescription(
        `• ✅ **Verification**\n` +
        `Виж <#${CHANNELS.verification}>, за да отключиш всички канали.\n\n` +

        `• 📜 **Правилата на сървъра**\n` +
        `Прочети правилата в <#${CHANNELS.rules}>, за да няма обърквания.\n\n` +

        `• 👑 **Роли на сървъра**\n` +
        `Избери си роли от <#${CHANNELS.roles}>.`
      )
      .setImage('attachment://welcome.png');

    await channel.send({
      content:
        `🎉 **Добре дошъл/ла, ${member}, в ${member.guild.name}!**\n` +
        `**Ти си нашият ${member.guild.memberCount} член! 🔥**`,
      embeds: [welcomeEmbed],
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
