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
const { joinVoiceChannel, createAudioPlayer, createAudioResource, StreamType } = require('@discordjs/voice');
const play = require('play-dl');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel]
});

const PREFIX = '!';
const player = createAudioPlayer();

client.once('ready', () => {
    console.log(`Bot encendido como: ${client.user.tag}`);
});

player.on('error', error => {
    console.error('Error de audio:', error);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'play') {
        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) return message.reply('¡Entra a un canal de voz primero!');

        const query = args.join(' ');
        if (!query) return message.reply('Escribe el nombre de una canción o pega un link.');

        try {
            // Busca la canción usando SoundCloud para evitar bloqueos de IP
            let source = await play.stream(query, { source: { soundcloud: 'tracks' } });

            const resource = createAudioResource(source.stream, {
                inputType: source.type
            });

            const connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: false
            });

            player.play(resource);
            connection.subscribe(player);

            message.reply(`🎶 Reproduciendo: **${query}**`);
        } catch (error) {
            console.error(error);
            message.reply('Error al intentar obtener la música. Intenta con otra canción o link de SoundCloud.');
        }
    }

    if (command === 'stop') {
        player.stop();
        message.reply('Música detenida.');
    }

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
