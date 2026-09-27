const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits, 
    EmbedBuilder,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.GuildMember]
});

const PREFIX = '!';
const GUILD_ID = '1551610431305556019'; // Tu ID de Servidor

// Definición de Comandos Slash (/)
const slashCommands = [
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Banea a un usuario del servidor.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a banear').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón del baneo').setRequired(false)),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Expulsa a un usuario del servidor.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a expulsar').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón de la expulsión').setRequired(false)),

    new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Aísla/silencia a un usuario temporalmente.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a aislar').setRequired(true))
        .addIntegerOption(opt => opt.setName('minutos').setDescription('Minutos de aislamiento').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Razón del aislamiento').setRequired(false)),

    new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Elimina una cantidad de mensajes en el canal.')
        .addIntegerOption(opt => opt.setName('cantidad').setDescription('Número de mensajes (1-100)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Muestra información sobre un usuario.')
        .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false)),

    new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Muestra detalles del servidor.'),

    new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Publica el panel del sistema de tickets.')
].map(cmd => cmd.toJSON());

// Registro INSTANTÁNEO de comandos en tu servidor específico
client.once('ready', async () => {
    console.log(`Bot encendido como: ${client.user.tag}`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('Sincronizando comandos Slash en el servidor...');
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, GUILD_ID),
            { body: slashCommands }
        );
        console.log('¡Comandos Slash cargados de inmediato en tu servidor!');
    } catch (error) {
        console.error('Error al registrar comandos Slash:', error);
    }
});

// Manejo de Interacciones (Slash Commands y Botones)
client.on('interactionCreate', async (interaction) => {
    // 1. Manejo del Botón de Tickets
    if (interaction.isButton()) {
        if (interaction.customId === 'create_ticket') {
            try {
                const guild = interaction.guild;
                const user = interaction.user;

                const channel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    permissionOverwrites: [
                        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                    ],
                });

                await interaction.reply({ content: `Tu ticket fue creado en: ${channel}`, ephemeral: true });

                const embed = new EmbedBuilder()
                    .setTitle(`Ticket de ${user.username}`)
                    .setDescription('Explica tu consulta o reporte. El staff te atenderá pronto.')
                    .setColor('#00ff00');

                await channel.send({ content: `<@${user.id}>`, embeds: [embed] });
            } catch (err) {
                console.error('Error al crear ticket:', err);
            }
        }
        return;
    }

    // 2. Manejo de Comandos Slash (/)
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, member, guild } = interaction;

    try {
        // /ban
        if (commandName === 'ban') {
            if (!member.permissions.has(PermissionFlagsBits.BanMembers)) {
                return interaction.reply({ content: '❌ No tienes permiso para banear miembros.', ephemeral: true });
            }
            await interaction.deferReply();
            const user = options.getUser('usuario');
            const reason = options.getString('razon') || 'Sin razón especificada';
            const targetMember = await guild.members.fetch(user.id).catch(() => null);

            if (!targetMember) return interaction.editReply('Usuario no encontrado.');
            if (!targetMember.bannable) return interaction.editReply('❌ No puedo banear a este usuario (rol superior o admin).');

            await targetMember.ban({ reason });
            const embed = new EmbedBuilder()
                .setTitle('🔨 Usuario Baneado')
                .addFields(
                    { name: 'Usuario', value: `${user.tag}`, inline: true },
                    { name: 'Razón', value: reason, inline: true },
                    { name: 'Moderador', value: `${interaction.user.tag}`, inline: true }
                )
                .setColor('#ff0000');
            return interaction.editReply({ embeds: [embed] });
        }

        // /kick
        if (commandName === 'kick') {
            if (!member.permissions.has(PermissionFlagsBits.KickMembers)) {
                return interaction.reply({ content: '❌ No tienes permiso para expulsar miembros.', ephemeral: true });
            }
            await interaction.deferReply();
            const user = options.getUser('usuario');
            const reason = options.getString('razon') || 'Sin razón especificada';
            const targetMember = await guild.members.fetch(user.id).catch(() => null);

            if (!targetMember) return interaction.editReply('Usuario no encontrado.');
            if (!targetMember.kickable) return interaction.editReply('❌ No puedo expulsar a este usuario.');

            await targetMember.kick(reason);
            const embed = new EmbedBuilder()
                .setTitle('👢 Usuario Expulsado')
                .addFields(
                    { name: 'Usuario', value: `${user.tag}`, inline: true },
                    { name: 'Razón', value: reason, inline: true },
                    { name: 'Moderador', value: `${interaction.user.tag}`, inline: true }
                )
                .setColor('#ffa500');
            return interaction.editReply({ embeds: [embed] });
        }

        // /timeout
        if (commandName === 'timeout') {
            if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                return interaction.reply({ content: '❌ No tienes permiso para aislar miembros.', ephemeral: true });
            }
            await interaction.deferReply();
            const user = options.getUser('usuario');
            const minutes = options.getInteger('minutos');
            const reason = options.getString('razon') || 'Sin razón especificada';
            const targetMember = await guild.members.fetch(user.id).catch(() => null);

            if (!targetMember) return interaction.editReply('Usuario no encontrado.');

            await targetMember.timeout(minutes * 60 * 1000, reason);
            return interaction.editReply(`⏳ **${user.tag}** fue aislado por **${minutes} minutos**. Razón: ${reason}`);
        }

        // /clear
        if (commandName === 'clear') {
            if (!member.permissions.has(PermissionFlagsBits.ManageMessages)) {
                return interaction.reply({ content: '❌ No tienes permiso para borrar mensajes.', ephemeral: true });
            }
            const amount = options.getInteger('cantidad');
            if (amount < 1 || amount > 100) return interaction.reply({ content: 'Ingresa un número entre 1 y 100.', ephemeral: true });

            await interaction.channel.bulkDelete(amount, true);
            return interaction.reply({ content: `🧹 Se borraron **${amount}** mensajes.`, ephemeral: true });
        }

        // /userinfo
        if (commandName === 'userinfo') {
            await interaction.deferReply();
            const targetUser = options.getUser('usuario') || interaction.user;
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

            const embed = new EmbedBuilder()
                .setTitle(`Información de ${targetUser.username}`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { name: 'ID', value: targetUser.id, inline: true },
                    { name: 'Cuenta Creada', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true },
                    { name: 'Unido al Servidor', value: targetMember ? `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>` : 'Desconocido', inline: true }
                )
                .setColor('#2b2d31');
            return interaction.editReply({ embeds: [embed] });
        }

        // /serverinfo
        if (commandName === 'serverinfo') {
            await interaction.deferReply();
            const embed = new EmbedBuilder()
                .setTitle(`Detalles de ${guild.name}`)
                .setThumbnail(guild.iconURL())
                .addFields(
                    { name: 'Miembros Totales', value: `${guild.memberCount}`, inline: true },
                    { name: 'Creado el', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
                    { name: 'ID del Servidor', value: guild.id, inline: true }
                )
                .setColor('#2b2d31');
            return interaction.editReply({ embeds: [embed] });
        }

        // /ticket-panel
        if (commandName === 'ticket-panel') {
            if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({ content: 'Solo administradores pueden enviar el panel.', ephemeral: true });
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

            await interaction.channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: 'Panel enviado correctamente.', ephemeral: true });
        }
    } catch (err) {
        console.error('Error ejecutando comando:', err);
    }
});

// Comandos de respaldo por prefijo (!)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // !clear <1-100>
    if (command === 'clear') {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const amount = parseInt(args[0]);
        if (!amount || amount < 1 || amount > 100) return message.reply('Uso: `!clear 1-100`');
        await message.channel.bulkDelete(amount, true);
        const msg = await message.channel.send(`🧹 Se borraron **${amount}** mensajes.`);
        setTimeout(() => msg.delete().catch(() => {}), 3000);
    }

    // !ban <@usuario>
    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) return;
        const member = message.mentions.members.first();
        if (!member) return message.reply('Menciona a un usuario.');
        const reason = args.slice(1).join(' ') || 'Sin razón';
        await member.ban({ reason });
        message.reply(`🔨 **${member.user.tag}** fue baneado.`);
    }

    // !kick <@usuario>
    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) return;
        const member = message.mentions.members.first();
        if (!member) return message.reply('Menciona a un usuario.');
        const reason = args.slice(1).join(' ') || 'Sin razón';
        await member.kick(reason);
        message.reply(`👢 **${member.user.tag}** fue expulsado.`);
    }

    // !ticket-panel
    if (command === 'ticket-panel') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const embed = new EmbedBuilder()
            .setTitle('Soporte | Ultimate Punch Playground')
            .setDescription('Presiona el botón para abrir un ticket privado.')
            .setColor('#2b2d31');
        const button = new ButtonBuilder().setCustomId('create_ticket').setLabel('Abrir Ticket').setStyle(ButtonStyle.Primary).setEmoji('📩');
        await message.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
    }
});

client.login(process.env.DISCORD_TOKEN);
