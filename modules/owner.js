module.exports = ( client ) => {

	function command_eval ( msg, args ) {
		try {
			let evaled = eval( msg.content.slice( msg.prefix.length + 5 ) );
			if ( typeof evaled !== 'string' ) {
				evaled = require( 'util' ).inspect( evaled );
			}
			return `\`\`\`x1\n${cleanText( evaled )}\n\`\`\``;
		} catch ( err ) {
			return `Error: ${cleanText( err )}`;
		}
	}

	// eval command
	client.registerCommand(
		'eval',
		command_eval,

		// command options
		{
			description: 'Runs arbitrary JavaScript. Oh, and *you* can\'t run it.',
			fullDescription: 'Runs arbitrary JavaScript. Oh, and *you* can\'t run it.',
			usage: '<Javascript>',
			requirements: {
				userIDs: [ client.config.ownerID ]
			}
		}
	);

	function command_kill ( msg ) {
		client.createMessage( msg.channel.id, `Killed the bot. Well done, ${msg.author.mention}.` );
		process.exit( 0 );
	}

	// eval command
	client.registerCommand(
		'kill',
		command_kill,

		// command options
		{
			description: 'This kills the bot.',
			fullDescription: 'This kills the bot.',
			usage: '',
			requirements: {
				userIDs: [ client.config.ownerID ]
			}
		}
	);
};

function cleanText ( text ) {
	if ( typeof text === 'string' ) {
		return text.replace( /`/g, '`\u200b' ).replace( /@/g, '@\u200b' );
	} else {
		return text;
	}
}
