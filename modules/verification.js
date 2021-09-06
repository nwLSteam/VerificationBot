const moment = require( 'moment' );

module.exports = ( client ) => {

	// Verification process

	// User join
	// Block the user from reading the bot offline channel
	// Allow the user to read the rules lite channel
	// Send them a direct message telling them to read the rules
	client.on( 'guildMemberAdd', ( guild, member ) => {

		client.editChannelPermission( client.config.botOfflineChannelID, member.id, 0, 1024, 'member', 'New user joined, set up verification process.' )
		      .catch( ( err ) => client.error( `Error occured while changing channel permissions: ${err}` ) );

		client.editChannelPermission( client.config.rulesChannelID, member.id, 1024, 0, 'member', 'New user joined, set up verification process.' )
		      .catch( ( err ) => client.error( `Error occured while changing channel permissions: ${err}` ) );

		client.getDMChannel( member.id ).then( ( channel ) => {

			client.createMessage( channel.id, client.config.joinMsg.replace( '<s>', guild.name ).replace( '<r>', `<#${client.config.rulesChannelID}>` ).replace( '<t>', client.nextPurge.fromNow() ) )
			      .catch( ( err ) => client.error( `Error occured while sending message to user: ${err}` ) );

		} ).catch( ( err ) => client.error( `Error occured when obtaining DM channel: ${err}` ) );

	} );

	// User messages the bot
	// If the verification phrase is entered correctly,
	// Ensure that the user hasn't already been verified
	// Add the user to the member role
	// Clean up the user specific channel permissions
	// Send them a direct message welcoming them to the server and inviting them to introduce themself.
	// Log it in the logging channel (if specified in the config)
	client.on( 'messageCreate', ( msg ) => {

		if ( !msg.channel.guild ) {

			// If in the guild the member already has a role (roles list > 0), return
			if ( client.guilds.find( ( guild ) => guild.id
			                                      === client.config.guildID ).members.find( ( member ) => member.id
			                                                                                              === msg.author.id ).roles.length
			     !== 0 ) {
				return;
			}

			if ( client.config.verificationPhrases.includes( msg.content.toLowerCase() ) ) {

				client.addGuildMemberRole( client.config.guildID, msg.author.id, client.config.memberRoleID, 'Verification process complete, adding user to member role.' )

				      .then( () => {

					      client.deleteChannelPermission( client.config.botOfflineChannelID, msg.author.id, 'Verification process complete, cleaning up.' )
					            .catch( ( err ) => client.error( `Error occured while deleting channel permissions: ${err}` ) );

					      client.deleteChannelPermission( client.config.rulesChannelID, msg.author.id, 'Verification process complete, cleaning up.' )
					            .catch( ( err ) => client.error( `Error occured while deleting channel permissions: ${err}` ) );

					      client.getDMChannel( msg.author.id ).then( ( channel ) => {

						      client.createMessage( channel.id, client.config.welcomeMsg.replace( '<s>', client.guilds.find( ( guild ) => guild.id
						                                                                                                                  === client.config.guildID ).name ).replace( '<i>', `<#${client.config.introductionsChannelID}>` ) )
						            .catch( ( err ) => client.error( `Error occured while sending message to user: ${err}` ) );

					      } ).catch( ( err ) => client.error( `Error occured when obtaining DM channel: ${err}` ) );

				      } ).catch( ( err ) => client.error( `Error occured when adding role to member: ${err}` ) );

				if ( client.config.logChannelID ) {

					client.createMessage( client.config.logChannelID, {

						embed: {

							author: {

								name: `${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`,
								icon_url: msg.author.dynamicAvatarURL( 'png', 512 )

							},

							footer: {

								text: 'Verification Complete'

							},

							timestamp: new Date(),
							color: 8978176, // #88FF00, light green
							type: 'rich'

						}

					} ).catch( ( err ) => client.error( `Error when creating log embed: ${err}` ) );

				}

				client.log( `${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) completed verification.` );

			}

		}

	} );

	// Verification purge function
	// Ensure that the guild exists
	// Grabs every single user that does not have roles and saves the size of the collection
	// Loops through the collection and kicks each member
	// Logs it in the logging channel (if specified in the config)
	function verificationPurge ( callback ) {

		client.log( 'Performing verification purge!' );
		let guild = client.guilds.find( ( guild ) => guild.id === client.config.guildID );

		if ( !guild ) {

			client.error( 'Cannot find the guild that is specified in the config!' );
			return;

		}

		let kickMembers = guild.members.filter( ( member ) => member.roles.length === 0 );
		let memberCount = kickMembers.length ? kickMembers.length : 'No';

		kickMembers.forEach( ( member ) => {

			member.kick( 'Member failed verification test, kicking from the server.' ).catch( ( err ) => client.error( `Error when kicking user: ${err}` ) );

		} );

		client.log( `Verification purge has been performed. ${memberCount} users were kicked. The next automated purge is ${client.nextPurge.fromNow()} (${client.nextPurge.format( 'HH:mm:ss Z' )})` );

		// Stop it from logging when it did not kick anyone.
		if ( !kickMembers.length && !callback ) {
			return;
		}

		if ( client.config.logChannelID ) {

			client.createMessage( client.config.logChannelID, {

				embed: {

					author: {

						name: `${client.user.username}#${client.user.discriminator} (${client.user.id})`,
						icon_url: client.user.dynamicAvatarURL( 'png', 512 )

					},

					description: `Verification purge has been performed. ${memberCount} users were kicked. The next automated purge is ${client.nextPurge.fromNow()} (${client.nextPurge.format( 'HH:mm:ss Z' )})`,

					footer: {

						text: 'Verification Purge'

					},

					timestamp: new Date(),
					color: 16711680, // #FF0000, red
					type: 'rich'

				}

			} ).catch( ( err ) => client.error( `Error when creating log embed: ${err}` ) );

		}

		if ( callback ) {
			callback();
		}

	}

	// 6 hour timer helper
	// Purely visual and not actually vital to any part of the program.
	// Makes sure that the next purge is always updated before running verification purge
	function sixHourTimer () {

		client.nextPurge = moment().add( 6, 'hours' );
		verificationPurge();

	}

	// Verification setup function
	// Ensure the guild exists
	// Get all members who have no roles
	// Ensure that they do not already have permission overwrite set up for them
	// Set up their permission overwrites and send them a DM
	// Log it in the logging channel (if specified in the config)
	function verificationSetup ( callback ) {

		client.log( 'Performing verification setup!' );

		let guild = client.guilds.find( ( guild ) => guild.id === client.config.guildID );

		if ( !guild ) {

			client.error( 'Cannot find the guild that is specified in the config!' );
			return;

		}

		let verifyMembers = guild.members.filter( ( member ) => member.roles.length === 0 );
		let memberCount = verifyMembers.length ? verifyMembers.length : 'No';

		verifyMembers.forEach( ( member ) => {

			if ( client.getChannel( client.config.botOfflineChannelID ).permissionOverwrites.find( ( permissionOverwrite ) => permissionOverwrite.id
			                                                                                                                  === member.id )
			     && client.getChannel( client.config.rulesChannelID ).permissionOverwrites.find( ( permissionOverwrite ) => permissionOverwrite.id
			                                                                                                                === member.id ) ) {
				return;
			}

			client.editChannelPermission( client.config.botOfflineChannelID, member.id, 0, 1024, 'member', 'Bot restarted, setting up verification process.' )
			      .catch( ( err ) => client.error( `Error occured while changing channel permissions: ${err}` ) );

			client.editChannelPermission( client.config.rulesChannelID, member.id, 1024, 0, 'member', 'Bot restarted, setting up verification process.' )
			      .catch( ( err ) => client.error( `Error occured while changing channel permissions: ${err}` ) );
			client.getDMChannel( member.id ).then( ( channel ) => {

				client.createMessage( channel.id, 'I am back online! Thank you for your patience.\n'
				                                  + client.config.joinMsg.replace( '<s>', guild.name ).replace( '<r>', `<#${client.config.rulesChannelID}>` ).replace( '<t>', client.nextPurge.fromNow() ) )
				      .catch( ( err ) => client.error( `Error occured while sending message to user: ${err}` ) );

			} ).catch( ( err ) => client.error( `Error occured when obtaining DM channel: ${err}` ) );

		} );

		if ( client.config.logChannelID ) {

			client.createMessage( client.config.logChannelID, {

				embed: {

					author: {

						name: `${client.user.username}#${client.user.discriminator} (${client.user.id})`,
						icon_url: client.user.dynamicAvatarURL( 'png', 512 )

					},

					description: `Verification setup is complete. ${memberCount} users need to be verified. The next automated purge is ${client.nextPurge.fromNow()} (${client.nextPurge.format( 'HH:mm:ss Z' )})`,

					footer: {

						text: 'Verification Setup'

					},

					timestamp: new Date(),
					color: 52479, // #00CCFF, light blue
					type: 'rich'

				}

			} ).catch( ( err ) => client.error( `Error when creating log embed: ${err}` ) );

		}

		client.log( `Verification setup is complete. ${memberCount} users need to be verified. The next automated purge is ${client.nextPurge.fromNow()} (${client.nextPurge.format( 'HH:mm:ss Z' )})` );
		if ( callback ) {
			callback();
		}

	}

	// On ready
	client.on( 'ready', () => {
		// Initialize the 6 hour timer
		setInterval( sixHourTimer, 6 * 60 * 60 * 1000 ); // 6 hours * 60 minutes * 60 seconds * 1000 milliseconds
		client.nextPurge = moment().add( 6, 'hours' );

		// Run verification setup
		verificationSetup();

	} );

	// Commands

	// verificationpurge command
	client.registerCommand( 'verificationpurge',

	                        // message prompt for confirmation
	                        'Are you sure? This will kick any user that does not have a role.\n\nYou have 30 seconds to make a decision.',

	                        // command options
	                        {

		                        aliases: [ 'veripurge' ],
		                        description: 'Kicks non-verified users.',
		                        fullDescription: 'Kicks any users that have not followed the verification procedure. This is automatically run every 6 hours.',

		                        requirements: {

			                        userIDs: [ client.config.ownerID ],
			                        roleIDs: [ client.config.modsRoleID ]

		                        },

		                        reactionButtons: [

			                        // yes button
			                        {

				                        emoji: '🆗',
				                        type: 'edit',
				                        response: ( msg ) => {

					                        msg.edit( 'Purging non-verified users...' );

					                        verificationPurge( () => {

						                        msg.removeReactions();
						                        msg.edit( 'Done!' );

					                        } );

				                        }

			                        },

			                        // no/cancel button
			                        {

				                        emoji: '❌',
				                        type: 'cancel'

			                        }

		                        ],

		                        reactionButtonTimeout: 30000

	                        } );

	// setup command
	client.registerCommand( 'verificationsetup',

	                        // performs set up
	                        ( msg ) => {

		                        msg.channel.createMessage( 'Performing setup...' ).then( ( m ) => {

			                        verificationSetup( () => {

				                        m.edit( 'Done!' );

			                        } );

		                        } );

	                        },

	                        // command options
	                        {

		                        aliases: [ 'verisetup' ],
		                        description: 'Performs verification setup.',
		                        fullDescription: 'Gives anyone who does not have any roles the necessary permissions to see the verification rules channel.',

		                        requirements: {

			                        userIDs: [ client.config.ownerID ],
			                        roleIDs: [ client.config.modsRoleID ]

		                        }

	                        } );

};
