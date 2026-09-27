client.once('ready', async () => {
    console.log(`Bot encendido como: ${client.user.tag}`);
    
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log('Registrando comandos Slash...');
        // Esto registra los comandos de inmediato en todos los servidores donde está el bot
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands }
        );
        console.log('¡Comandos Slash registrados con éxito!');
    } catch (error) {
        console.error('Error al registrar comandos Slash:', error);
    }
});
