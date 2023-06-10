// Libraries
const Eris = require( 'eris' );
const chalk = require( 'chalk' );
const moment = require( 'moment' );
const config = require( './config' );

// Intiialize the client
const client = new Eris.CommandClient(
	// Discord token
	config.discordToken,

	// Client options
	{
		disableEvents: {
			TYPING_START: true
		},

		// all of them
		// see: https://discord.com/developers/docs/topics/gateway#gateway-intents
		// binary 111 1111 1111 1111 (all bits from 0 to 14 set) is 32767
		intents: 32767
	},

	// Command options
	{
		description: 'A modular Discord bot for roles and verification.\n\n'
		             + 'Created by `Visate#7752` (ID: `97198953430257664`).\n'
		             + 'Current version adapted and maintained by `nwL#2120` (ID `133154727998390272`).\n'
		             + 'PM `nwL#2120` for questions and suggestions.',
		owner: '',
		prefix: config.prefixes,

		defaultCommandOptions: {
			caseInsensitive: true
		}
	}
);

const configDefault = {
	autoPurgeDelayInMinutes: 360 // 6 hours
}

// Attach the config to the client
client.config = Object.assign(configDefault, config);

// Logging methods
client.log = ( ...msg ) => console.log( chalk.green.bold( `[LOG] [${moment().format( 'MMM DD HH:mm:ss' )}]` ), ...msg );
client.error = ( ...msg ) => console.log( chalk.bgRed.white.bold( `[ERR] [${moment().format( 'MMM DD HH:mm:ss' )}]` ), ...msg );
client.warn = ( ...msg ) => console.log( chalk.bgYellow.white.bold( `[WRN] [${moment().format( 'MMM DD HH:mm:ss' )}]` ), ...msg );

// Register modules
require( './util/loadModules' )( client );

// Connect the client
client.connect();
