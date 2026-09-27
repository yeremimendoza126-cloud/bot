const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits, 
    EmbedBuilder 
} = require('discord.js');
const { DisTube } = require('distube');
const { SoundCloudPlugin } = require('@distube/soundcloud');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel]
});

// Configuración de DisTube para manejar audio fluido
const distube = new DisTube(client, {
    emitNewSongOnly: true,
    plugins: [new SoundCloudPlugin()]
});

const PREFIX = '!';

client.once('ready', () => {
    console.log(`Bot encendido como: ${client.user.tag}`);
});

// Eventos de reproducción para confirmar en chat
distube.on('playSong', (queue, song) => {
    queue.textChannel?.send(`🎶 Reproduciendo ahora: **${song.name}**`);
});

distube.on('error', (channel, error) => {
    console.error('Error en DisTube:', error);
    if (channel) channel.send('Ocurrió un error al intentar reproducir la canción.');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // COMANDO PLAY
    if (command === 'play') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('¡Entra a un canal de voz primero!');

        const query = args.join(' ');
        if (!query) return message.reply('Escribe el nombre de una canción.');

        try {
            await distube.play(voiceChannel, query, {
                textChannel: message.channel,
                member: message.member
            });
        } catch (error) {
            console.error(error);
            message.reply('Error al procesar la reproducción.');
        }
    }

    // COMANDO STOP
    if (command === 'stop') {
        const queue = distube.getQueue(message);
        if (!queue) return message.reply('No hay música en reproducción.');
        distube.stop(message);
        message.reply('Música detenida.');
    }

    // COMANDO PANEL TICKETS
    if (command === 'ticket-panel') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('Solo administradores pueden usar esto.');
        }

        const embed = new EmbedBuilder()
            .setTitle('Soporte | Ultimate Punch Playground')
            .setDescription('Presiona el botón de abajo para abrir un ticket privado con el staff.')
            .setColor('#2b2d31');

        const button = new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('Abrir Ticket')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📩');

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket') {
        const guild = interaction.guild;
        const user = interaction.user;

        const channel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                },
            ],
        });

        await interaction.reply({ content: `Tu ticket fue creado en: ${channel}`, ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle(`Ticket de ${user.username}`)
            .setDescription('Explica tu problema detalladamente. El staff te responderá pronto.')
            .setColor('#00ff00');

        await channel.send({ content: `<@${user.id}>`, embeds: [embed] });
    }
});

client.login(process.env.DISCORD_TOKEN);
