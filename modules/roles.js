const jsonfile = require( 'jsonfile' );
const commonTags = require( 'common-tags' );
const path = require( 'path' );
const stripIndent = commonTags.stripIndent;
const stripIndents = commonTags.stripIndents;
const rolesPath = path.dirname( __dirname ) + '/lists/roles.json';

// used for smart documentation despite being unused
const Eris = require( 'eris' );
const { Message } = require( 'eris' );

module.exports = ( client ) => {

	if ( !client.config.defaultGroup ) {
		client.error( 'Default group is empty!' );
		process.exit( 1 );
	}

	function sliceIntoMessagePieces ( message, size = 1900 ) {
		let messageChunks = [].concat.apply(
			[],
			message.split( '' ).map( function ( x, i ) {
				return i % size ? [] : message.slice( i, i + size );
			}, message )
		);
		let messageArray = [];
		let closedWithCode = false;

		for ( let messageChunkKey in messageChunks ) {
			let messageChunk = messageChunks[messageChunkKey];
			let count = ( messageChunk.match( /```/g ) || [] ).length;

			if ( closedWithCode && ( count % 2 ) === 0 ) {
				// close and open with code
				messageChunk = '```diff\n' + messageChunk;
				messageChunk = messageChunk + '\n```';
				closedWithCode = true;
			} else if ( !closedWithCode && ( count % 2 ) === 1 ) {
				// close with code
				messageChunk = messageChunk + '\n```';
				closedWithCode = true;
			} else if ( closedWithCode && ( count % 2 ) === 1 ) {
				// open with code
				messageChunk = '```diff\n' + messageChunk;
				closedWithCode = true;
			} else {
				// non-code message
				closedWithCode = false;
			}

			messageChunks[messageChunkKey] = messageChunk;
		}

		return messageChunks;
	}

	function sendMessage ( msg, message ) {
		if ( message.length < 1900 ) {
			return client.createMessage( msg.channel.id, message );
		}

		let messageChunks = sliceIntoMessagePieces( message );
		let messageArray = [];

		for ( const messageChunk of messageChunks ) {
			messageArray.push(
				client.createMessage( msg.channel.id, messageChunk )
			);
		}

		return messageArray;
	}

	/**
	 * Creates a message in the form of:
	 *
	 > user#1234: lorem ipsum dolor sit amet
	 *
	 * The listed user is not a mention, and is extracted from the msg object.
	 *
	 * @param {Eris.Message} msg The message object from Eris.
	 * @param {string} message A string containing the message to be displayed.
	 */
	function sendMessage_withAuthor ( msg, message ) {
		sendMessage( msg, `${msg.author.username}#${msg.author.discriminator}: ${message}` );
	}

	function sendMessage_pingAuthor ( msg, message ) {
		sendMessage( msg, `${msg.author.mention}: ${message}` );
	}

	async function async_sendMessage ( msg, message ) {
		if ( message.length < 1900 ) {
			return await client.createMessage( msg.channel.id, message );
		}

		let messageChunks = sliceIntoMessagePieces( message );
		let messageArray = [];

		for ( let messageChunk of messageChunks ) {
			messageArray.push(
				await client.createMessage( msg.channel.id, messageChunk )
			);
		}

		return messageArray;
	}

	async function async_sendMessage_withAuthor ( msg, message ) {
		return await async_sendMessage( msg, `${msg.author.username}#${msg.author.discriminator}: ${message}` );
	}

	async function async_sendMessage_pingAuthor ( msg, message ) {
		return await async_sendMessage( msg, `${msg.author.mention}: ${message}` );
	}

	function logCommand ( msg, args ) {
		client.log( `${msg.author.username}#${msg.author.discriminator} issued command: ${msg.prefix}${msg.command.fullLabel} ${args.join( ' ' )}` );
	}

	function logInfo ( msg, message ) {
		client.log( `[${msg.author.username}#${msg.author.discriminator} | ${msg.command.label}] ${message}` );
	}

	// Obtain existing object, else create the file for it
	let GROUPS;
	let REGIONS;
	let GROUP_ORDER;

	// Because this line of code is used way too damn much
	function saveRolesToFile () {
		let roles = {};
		roles.regions = REGIONS;
		roles.groups = GROUPS;
		roles.order = GROUP_ORDER;

		jsonfile.writeFileSync( rolesPath, roles, { spaces: 4 } );
		client.log( 'Saved roles to file.' );
	}

	function loadRolesFromFile () {
		try {
			let roles = jsonfile.readFileSync( rolesPath );
			GROUPS = roles.groups;
			REGIONS = roles.regions;
			GROUP_ORDER = roles.order;

			for ( let i = GROUP_ORDER.length - 1; i >= 0; --i ) {
				let group = GROUP_ORDER[i];

				if ( !GROUPS.hasOwnProperty( group ) ) {
					client.warn( `Removing missing group ${group} from order list...` );
					GROUP_ORDER.splice( i, 1 );
				}
			}

			for ( const group in GROUPS ) {
				if ( !GROUP_ORDER.includes( group ) ) {
					client.warn( `Adding missing group ${group} to order list...` );
					GROUP_ORDER.push( group );
				}
			}

			saveRolesToFile();
			client.log( 'Loaded roles from file.' );

		} catch ( e ) {
			REGIONS = [];
			GROUPS = {};
			GROUPS[client.config.defaultGroup] = [];
			GROUP_ORDER = [ client.config.defaultGroup ];

			client.warn( 'Couldn\'t find roles.json or it is malformed, making a new one...' );
			saveRolesToFile(); // it's basically the exact same line of code
		}
	}

	loadRolesFromFile();

	function getGroups () {
		return GROUPS;
	}

	function getOrder () {
		return GROUP_ORDER;
	}

	function getRolesByGroupName ( name ) {
		if ( GROUPS.hasOwnProperty( name ) ) {
			return GROUPS[name];
		}

		return undefined;
	}

	function getGroupByRoleID ( id ) {
		for ( const groupsKey in GROUPS ) {
			if ( GROUPS[groupsKey].includes( id ) ) {
				return groupsKey;
			}
		}

		return undefined;
	}

	function addGroup ( group ) {
		if ( GROUPS.hasOwnProperty( group ) ) {
			return;
		}

		GROUPS[group] = [];
		GROUP_ORDER.push( group );
	}

	function deleteGroup ( group ) {
		if ( !groupExists( group ) ) {
			return;
		}

		let count = getRoleCountInGroup( group );
		if ( count !== 0 ) {
			client.warn( `Deleting non-empty group ${group} with ${count} roles!` );
		}

		delete GROUPS[group];
		GROUP_ORDER.splice( GROUP_ORDER.indexOf( group ), 1 );
	}

	/**
	 * Concat a group onto another one. Adds the roles from 'source' onto 'target' without changing the source.
	 * @param target_name Name of the target group. Will get changed.
	 * @param source_name Name of the source group. Will not get changed.
	 */
	function concatGroups ( target_name, source_name ) {
		GROUPS[target_name] = GROUPS[target_name].concat( GROUPS[source_name] );
	}

	function addRoleToGroup ( group, id ) {
		GROUPS[group].push( id );
	}

	function addRolesToGroup ( group, roles_array ) {
		GROUPS[group] = GROUPS[group].concat( roles_array );
	}

	function addRoleToRegions ( id ) {
		REGIONS.push( id );
	}

	function removeGroupedRole ( id ) {
		let group = getGroupByRoleID( id );

		if ( group === undefined ) {
			return;
		}

		GROUPS[group].splice( GROUPS[group].indexOf( id ), 1 );
	}

	function removeRegionRole ( id ) {
		if ( isRegionRole( id ) ) {
			REGIONS.splice( REGIONS.indexOf( id ), 1 );
		}
	}

	function groupExists ( group ) {
		return GROUPS.hasOwnProperty( group );
	}

	function getRoleCountInGroup ( name ) {
		return getRolesByGroupName( name ).length;
	}

	function isGroupEmpty ( name ) {
		return getRoleCountInGroup( name ) === 0;
	}

	function getRoleName ( msg, id ) {
		let query = msg.channel.guild.roles.filter( r => ( r.id === id ) );

		if ( query.length === 0 ) {
			return undefined;
		}

		return query[0].name;
	}

	function getMatchingGuildRoles ( msg, rolename ) {
		let query = msg.channel.guild.roles.filter(
			r => (
				r.id === rolename                                  // either role matches an ID
				|| r.name.toLowerCase() === rolename.toLowerCase() // or role matches a name
			)
		);

		if ( query.length > 1 ) {
			let checkCaseQuery = query.filter( r => r.name === rolename );

			if ( checkCaseQuery.length === 1 ) {
				return checkCaseQuery;
			} else {
				return query;
			}
		} else if ( query.length === 1 ) {
			return query;
		} else {
			return [];
		}
	}

	function getMatchingAndAddedGuildRoles ( msg, role ) {
		let roles = [];
		for ( const group in GROUPS ) {
			roles = roles.concat( GROUPS[group] );
		}

		let query = msg.channel.guild.roles.filter(
			r => (
				     isRegionRole( r.id )
				     || isRegularRole( r.id )
			     ) && (
				     r.id === role                                  // either role matches an ID
				     || r.name.toLowerCase() === role.toLowerCase() // or role matches a name
			     )
		);

		if ( query.length > 1 ) {
			let checkCaseQuery = query.filter( r => r.name === role );

			if ( checkCaseQuery.length === 1 ) {
				return checkCaseQuery;
			} else {
				return query;
			}
		} else if ( query.length === 1 ) {
			return query;
		} else {
			return [];
		}
	}

	function isRegularRole ( id ) {
		for ( const group in GROUPS ) {
			if ( GROUPS[group].includes( id ) ) {
				return true;
			}
		}

		return false;
	}

	function isRegionRole ( id ) {
		return REGIONS.includes( id );
	}

	function assignRoleToCurrentUser ( msg, id, message = '' ) {
		msg.member.addRole( id, message ).then( r => {} );
	}

	function unassignRoleFromCurrentUser ( msg, id, message = '' ) {
		msg.member.removeRole( id, message ).then( r => {} );
	}

	function getArgumentsAsArray ( args, delimiter = ',' ) {
		if ( args.length === 0 ) {
			return [];
		}
		let string = args.join( ' ' );
		let retval = string.split( delimiter );
		for ( let i = 0; i < retval.length; i++ ) {
			retval[i] = retval[i].trim();
		}
		return retval;
	}

	function arrayHasDuplicates ( array ) {
		return ( new Set( array ) ).size !== array.length;
	}

	// groups role manager
	let groupsCommand = client.registerCommand(
		'groups',
		// content
		stripIndent`
            Valid subcommands:
            **list** - lists current groups
            **add** - adds a new group
            **remove** - removes a group
            **yeet** - moves all roles from one group to another
            **yoink** - moves some roles to a group
            `,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Allows for the management of opt-in roles. Subcommands add and remove.',
			fullDescription: 'Allows for the management of opt-in roles.',
			usage: '<subcommand>'
		}
	);

	/**
	 * Adds one or more empty groups to the groups object.
	 *
	 * @param {Eris.Message} msg The Eris message object.
	 * @param {Array[string]} args An array of strings, sent by Eris, containing the group names.
	 */
	function command_groups_add ( msg, args ) {
		logCommand( msg, args );
		args = getArgumentsAsArray( args );
		let total = args.length;
		let i = 0;

		async_sendMessage_withAuthor( msg, 'Working on it...' ).then( wait_message => {
			let return_message = '```diff\n';

			for ( const toAdd of args ) {
				if ( groupExists( toAdd ) ) {
					return_message += `- Group '${toAdd}' already exists!\n`;
					continue;
				}

				++i;
				addGroup( toAdd );
				return_message += `+ Added group '${toAdd}'!\n`;
			}

			return_message += '```\n';

			wait_message.delete();

			if ( i === 0 ) {
				sendMessage_pingAuthor( msg, `**Added no groups.**` + return_message );
			} else if ( i === total ) {
				sendMessage_pingAuthor( msg, `**Added ${i} groups.**` + return_message );
			} else {
				sendMessage_pingAuthor( msg, `**Added ${i} of ${total} groups.**` + return_message );
			}

			saveRolesToFile();
		} );
	}

	// Add subcommand, adds a new opt-in role. If it doesn't already exist, a new role is created.
	groupsCommand.registerSubcommand(
		'add',
		command_groups_add,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Adds one or multiple groups.',
			fullDescription: 'Adds one or multiple groups.',
			usage: '<group[, ...]>'
		}
	);

	/**
	 * Rmoves one or more groups from the groups object.
	 *
	 * @param {Eris.Message} msg The Eris message object.
	 * @param {Array[string]} args An array of strings, sent by Eris, containing the group names.
	 */
	function command_groups_remove ( msg, args ) {
		logCommand( msg, args );
		args = getArgumentsAsArray( args );
		let total = args.length;
		let i = 0;
		let moved = 0;
		async_sendMessage_withAuthor( msg, 'Working on it...' ).then( wait_message => {
			let return_message = '```diff\n';

			for ( const toRemove of args ) {

				if ( toRemove === client.config.defaultGroup ) {
					return_message += `- Cannot remove default group '${client.config.defaultGroup}'!\n`;
					continue;
				}

				if ( !groupExists( toRemove ) ) {
					return_message += `- Group '${toRemove}' does not exist!\n`;
					continue;
				}

				++i;

				let roleCount = getRoleCountInGroup( toRemove );
				if ( roleCount > 0 ) {
					// make sure the roles are moved back to the default group
					concatGroups( client.config.defaultGroup, toRemove );
					moved += roleCount;

					deleteGroup( toRemove );
					return_message += `+ Deleted group '${toRemove}' (moved ${roleCount} roles `
					                  + `to default group '${client.config.defaultGroup}')!\n`;
				} else {
					deleteGroup( toRemove );
					return_message += `+ Deleted group '${toRemove}'!\n`;
				}

			}

			return_message += '```\n';

			let moved_message = moved > 0
			                    ? ` Moved ${moved} roles back to default group '${client.config.defaultGroup}'`
			                    : '';

			wait_message.delete();

			if ( i === 0 ) {
				sendMessage_pingAuthor( msg, `**Removed no groups.**` + return_message );
			} else if ( i === total ) {
				sendMessage_pingAuthor( msg, `**Removed ${i} groups.**` + moved_message + return_message );
			} else {
				sendMessage_pingAuthor( msg, `**Removed ${i} of ${total} groups.**` + moved_message + return_message );
			}
			saveRolesToFile();
		} );
	}

	groupsCommand.registerSubcommand(
		'remove',
		command_groups_remove,

		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Removes one or multiple groups.',
			fullDescription: 'Removes one or multiple groups.',
			usage: '<group[, ...]>'
		}
	);

	/**
	 * Lists all groups, indicating the default group and marking empty groups.
	 */
	function command_groups_list ( msg, args ) {
		logCommand( msg, args );
		let message = '**Current groups:**\n';
		for ( const group of GROUP_ORDER ) {
			message += `• ${group}`;
			if ( group === client.config.defaultGroup ) {
				message += ' **(default group)**';
			}
			if ( getRoleCountInGroup( group ) === 0 ) {
				message += ' *(empty)*';
			}
			message += '\n';
		}
		return message;
	}

	groupsCommand.registerSubcommand(
		'list',
		command_groups_list,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Lists all opt-in roles.',
			fullDescription: 'Lists all opt-in roles.'
		}
	);

	/**
	 * Merges one group into the other. Deletes the first group.
	 *
	 * @param {Eris.Message} msg The Eris message object.
	 * @param {Array[string]} args A string array of arguments.
	 * @returns {string} The message for Eris to display.
	 */
	function command_groups_merge ( msg, args ) {
		logCommand( msg, args );
		let total = args.length;
		if ( total !== 3 || args[1] !== 'into' ) {
			return `Usage: \`${msg.prefix}groups merge <from> into <to>\``;
		}

		let from = args[0];
		if ( !groupExists( from ) ) {
			return `Group \`${from}\` does not exist!`;
		}

		let to = args[2];
		if ( !groupExists( to ) ) {
			return `Group \`${to}\` does not exist!`;
		}

		if ( from === to ) {
			return 'The groups are the same!';
		}

		let count = getRoleCountInGroup( from );

		if ( count === 0 ) {
			return `Group \`${from}\` has no roles to move!`;
		}

		concatGroups( to, from );
		deleteGroup( from );

		saveRolesToFile();

		return `Merged ${count} roles from group \`${from}\` into group \`${to}\` and deleted group \`${from}\`!`;
	}

	groupsCommand.registerSubcommand(
		'merge',
		command_groups_merge,

		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Merges one group into another.',
			fullDescription: 'Merges one group into another. Deletes the first group.',
			usage: '<group> into <group>'
		}
	);

	function command_groups_reorder ( msg, args ) {
		logCommand( msg, args );
		args = getArgumentsAsArray( args );

		if ( args.length === 0 ) {
			let groups = '';

			let first = true;
			for ( const group of GROUP_ORDER ) {
				if ( first ) {
					first = false;
				} else {
					groups += ', ';
				}

				groups += `\`${group}\``;

			}

			sendMessage( msg,
			             `Use \`${msg.prefix}groups reorder <comma-separated list>\` to reorder the groups.\n`
			             + 'The current group order is:\n\n'
			             + groups
			);

			saveRolesToFile();
			return;
		}

		async_sendMessage_withAuthor( msg, 'Working on it...' ).then( wait_message => {
			let failure = false;
			let return_message = '```diff\n';

			if ( arrayHasDuplicates( args ) ) {
				failure = true;
				return_message += `- List contains duplicates!\n`;
			}

			for ( const groupName of args ) {
				if ( !GROUP_ORDER.includes( groupName ) ) {
					failure = true;
					return_message += `- Your list includes this unknown group: ${groupName}\n`;
				}
			}

			for ( const groupName of GROUP_ORDER ) {
				if ( !args.includes( groupName ) ) {
					failure = true;
					return_message += `- Your list is missing: ${groupName}\n`;
				}
			}

			return_message += '```\n';

			wait_message.delete();

			if ( failure ) {
				sendMessage_pingAuthor( msg, `**Failed to reorder groups:**\n` + return_message );
				return;
			}

			sendMessage_pingAuthor( msg, `Reordered groups!` );

			GROUP_ORDER = args;
			saveRolesToFile();
		} );
	}

	groupsCommand.registerSubcommand(
		'reorder',
		command_groups_reorder,

		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Reorders the groups.',
			fullDescription: 'Reorders the groups. Use the command with no arguments to get the current list.',
			usage: '[comma-separated group list]'
		}
	);

	function command_groups_fix ( msg, args ) {
		logCommand( msg, args );
		client.warn( 'Group fix was triggered.' );
		async_sendMessage( msg, 'Regenerating group list...' ).then( wait_message => {
			saveRolesToFile();
			loadRolesFromFile();
			client.warn( 'Group order: ' + GROUP_ORDER );
			client.warn( 'Groups: ' + JSON.stringify( GROUPS ) );
			client.warn( 'Regions: ' + REGIONS );
			wait_message.delete();
			sendMessage_pingAuthor( msg, 'Groups should be fixed now.' );
		} );
	}

	groupsCommand.registerSubcommand(
		'fix',
		command_groups_fix,

		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Fixes missing groups.',
			fullDescription: 'Fixes missing groups. If the probblem persists, please contact @nwL#2120.',
			usage: ''
		}
	);

	function command_selfrole ( msg, args ) {
		logCommand( msg, args );
		args = getArgumentsAsArray( args );

		if ( args.length === 0 ) {
			sendMessage_pingAuthor( msg, `Please specify a role. You can use \`${msg.prefix}selfrole list\` to view them.` );
			return;
		}

		let return_message = '';

		for ( const rolename of args ) {
			if ( rolename === '' ) {
				continue;
			}

			let roleList = getMatchingAndAddedGuildRoles( msg, rolename );

			if ( roleList.length === 0 ) {
				return_message += `${msg.member.mention}, there is no ${rolename} role!\n`;
				continue;
			}

			if ( roleList.length > 1 ) {
				// todo better message
				return_message += stripIndents`${msg.member.mention},  
                    There are multiple opt-in roles with this name! Use the ID instead to self assign them.
                    
                    ${roleList.map( r => `**${r.name}** -- ${r.id}` ).join( '\n' )}\n`;
				continue;
			}

			let role = roleList[0];

			if ( isRegionRole( role.id ) ) {
				// get region roles the user already has
				let existing = msg.member.roles.filter( r => REGIONS.includes( r ) );

				existing.forEach( ( roleid ) => {
					if ( roleid !== role.id ) {
						unassignRoleFromCurrentUser( msg, roleid, 'Removing existing region role to add new one.' );
					}
				} );

				assignRoleToCurrentUser( msg, role.id, 'Adding region role to user.' );
				return_message += `${msg.member.mention}, you are now a ${role.name}!\n`;
			} else if ( isRegularRole( role.id ) ) {
				assignRoleToCurrentUser( msg, role.id, 'Adding optin role to user.' );
				return_message += `${msg.member.mention}, you are now a ${role.name}!\n`;
			}
		}

		sendMessage( msg, return_message );
	}

	// Selfrole command, allows the user to give a role to their user.
	let selfrole = client.registerCommand(
		'selfrole',
		command_selfrole,

		// command options
		{
			aliases: [ 'iam' ],
			guildOnly: true,
			description: 'Give or remove roles from yourself.',
			fullDescription: 'Give yourself one or multiple of the defined roles on the server. If multiple, separate them with commas. List roles with subcommand list. Remove roles with subcommand remove or not. You may only have one region role, but an unlimited amount of other roles.',
			usage: '<role[, ...]>'
		}
	);

	function command_selfrole_list ( msg, args ) {
		logCommand( msg, args );
		let message = 'These are the roles you may currently assign yourself.\n\n';

		if(REGIONS.length !== 0) {
			message += `**Region Roles** (only one possible!)\n`;
			let roles = [];
			for ( const id of REGIONS ) {
				roles.push( getRoleName( msg, id ) );
			}
			roles = roles.join( ', ' );
			message += `${roles}\n\n`;
		}

		for ( const group of GROUP_ORDER ) {
			if ( isGroupEmpty( group ) ) {
				continue;
			}

			message += `**${group}**\n`;
			let roles = [];
			for ( const id of GROUPS[group] ) {
				roles.push( getRoleName( msg, id ) );
			}
			roles = roles.join( ', ' );
			message += `${roles}\n\n`;
		}

		return message;
	}

	// List subcommand, lists all possible roles to be self-assigned
	selfrole.registerSubcommand(
		'list',
		command_selfrole_list,

		// command options
		{
			guildOnly: true,
			description: 'List all available self-assignable roles.',
			fullDescription: 'Lists all available region and other roles that are self-assignable.'
		}
	);

	function command_selfrole_remove ( msg, args ) {
		logCommand( msg, args );
		args = getArgumentsAsArray( args );

		let return_message = '';

		for ( const rolename of args ) {
			if ( rolename.length === 0 ) {
				return;
			}

			let roleList = getMatchingAndAddedGuildRoles( msg, rolename );

			// no roles found
			if ( roleList.length === 0 ) {
				return_message += `${msg.member.mention}, there is no ${rolename} role!\n`;
				continue;
			}

			if ( roleList.length > 1 ) {
				// todo better message
				return_message += stripIndents`${msg.member.mention},  
                    There are multiple opt-in roles with this name! Use the ID instead to self assign them.
                    
                    ${roleList.map( r => `**${r.name}** -- ${r.id}` ).join( '\n' )}\n`;
				continue;
			}

			let role = roleList[0];

			if ( isRegionRole( role.id ) || isRegularRole( role.id ) ) {
				unassignRoleFromCurrentUser( msg, role.id, 'Removing opt-in role from user.' );
				return_message += `${msg.member.mention}, removed the ${role.name} tag from you!\n`;
			}
		}

		sendMessage( msg, return_message );
	}

	// Remove subcommand, allows the user to remove their own self-assignable tags.
	selfrole.registerSubcommand(
		'remove',
		command_selfrole_remove,

		// command options
		{
			aliases: [ 'not' ],
			guildOnly: true,
			description: 'Allows the user to remove their own opt-in roles.',
			fullDescription: 'Allows the user to remove their own opt-in roles.',
			usage: '<role[, ...]>'
		}
	);

	// Mod commands
	// These commands allow the mods to define which roles are opt ins or not.

	// Optin role manager
	let optinCommand = client.registerCommand(
		'optin',
		// content
		stripIndent`
            Valid subcommands:

            **add** - adds a new opt-in role
            **remove** - removes an opt-in role
            **move** - moves roles between groups
            **list** - lists current opt-in roles`,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Allows for the management of opt-in roles. Subcommands add and remove.',
			fullDescription: 'Allows for the management of opt-in roles.',
			usage: '<subcommand>'
		}
	);

	function command_optin_add ( msg, args ) {
		logCommand( msg, args );
		args = getArgumentsAsArray( args );

		let total = args.length;
		let i = 0;

		async_sendMessage_withAuthor( msg, 'Working on it...' ).then( wait_message => {
			let return_message = '```diff\n';
			for ( const roleName of args ) {
				let roleList = getMatchingGuildRoles( msg, roleName );

				if ( roleList.length > 1 ) {
					return_message += `- Ambiguous input for '${roleName}'.\n`;
					return_message += `--- Matching roles are:\n`;

					for ( const roleListElement of roleList ) {
						return_message += `--- ${roleListElement.name} (ID ${roleListElement.id})\n`;
					}

					continue;
				}

				if ( roleList.length === 0 ) {
					msg.channel.guild.createRole( { name: roleName }, 'Creating new opt-in role.' ).then( ( role ) => {
						// todo: add to group here
						addRoleToGroup( client.config.defaultGroup, role.id );
						saveRolesToFile();
					} );

					return_message += `+ Created a new opt-in role '${roleName}'!\n`;
					++i;
					continue;
				}

				let role = roleList[0];

				if ( isRegularRole( role.id ) ) {
					return_message += `- '${role.name}' is already an opt-in role!\n`;
					continue;
				}

				let regionNotice = '';
				if ( isRegionRole( role.id ) ) {
					removeRegionRole( role.id );
					regionNotice = ' (moved over from region roles)';
				}

				// todo: add to specific group here
				addRoleToGroup( client.config.defaultGroup, role.id );

				return_message += `+ Added '${role.name}' to the list of opt-in roles!` + regionNotice + '\n';
				++i;
			}
			return_message += '```\n';

			wait_message.delete();

			if ( i === 0 ) {
				sendMessage_pingAuthor( msg, `**Added no opt-in roles.**\n` + return_message );
			} else if ( i === total ) {
				sendMessage_pingAuthor( msg, `**Added ${i} opt-in roles.**\n` + return_message );
			} else {
				sendMessage_pingAuthor( msg, `**Added ${i} of ${total} opt-in roles.**\n` + return_message );
			}

			saveRolesToFile();
		} );
	}

	// Add subcommand, adds a new opt-in role. If it doesn't already exist, a new role is created.
	optinCommand.registerSubcommand(
		'add',
		command_optin_add,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Adds one mor more opt-in roles.',
			fullDescription: 'Adds one or more opt-in roles. Can be used with existing roles or will create a new role. Will return IDs if multiple roles are found.',
			usage: '<role[, ...]>'
		}
	);

	function command_optin_remove ( msg, args ) {
		logCommand( msg, args );
		args = getArgumentsAsArray( args );

		let total = args.length;
		let i = 0;

		async_sendMessage_withAuthor( msg, 'Working on it...' ).then( wait_message => {
			let return_message = '```diff\n';

			for ( const roleName of args ) {
				let roleList = getMatchingGuildRoles( msg, roleName );

				if ( roleList.length > 1 ) {
					return_message += `- Ambiguous input for '${roleName}'.\n`;
					return_message += `--- Matching roles are:\n`;

					for ( const roleListElement of roleList ) {
						return_message += `--- ${roleListElement.name} (ID ${roleListElement.id})\n`;
					}

					continue;
				}

				if ( roleList.length === 0 || !isRegularRole( roleList[0].id ) ) {
					return_message += `- '${roleName}' isn't an opt-in role!\n`;
					continue;
				}

				let role = roleList[0];

				++i;
				removeGroupedRole( role.id );

				return_message += `+ Removed '${role.name}' as an opt-in role.\n`;
			}

			return_message += '```\n';

			wait_message.delete();

			if ( i === 0 ) {
				sendMessage_pingAuthor( msg, `**Removed no opt-in roles.**\n` + return_message );
			} else if ( i === total ) {
				sendMessage_pingAuthor( msg, `**Removed ${i} opt-in roles.**\n` + return_message );
			} else {
				sendMessage_pingAuthor( msg, `**Removed ${i} of ${total} opt-in roles.**\n` + return_message );
			}

			saveRolesToFile();
		} );
	}

	optinCommand.registerSubcommand(
		'remove',
		command_optin_remove,

		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Removes one or more opt-in roles.',
			fullDescription: 'Removes one or more opt-in roles.',
			usage: '<role[, ...]>'
		}
	);

	function command_optin_list ( msg, args ) {
		logCommand( msg, args );
		let message = '**Current opt-in roles:**\n';

		for ( const group of GROUP_ORDER ) {
			if ( isGroupEmpty( group ) ) {
				continue;
			}

			message += `**${group}**\n`;
			let roles = [];
			for ( const id of GROUPS[group] ) {
				roles.push( getRoleName( msg, id ) );
			}
			roles = roles.join( ', ' );
			message += `${roles}\n\n`;
		}

		return message;
	}

	optinCommand.registerSubcommand(
		'list',
		command_optin_list,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Lists all opt-in roles.',
			fullDescription: 'Lists all opt-in roles.'
		}
	);

	function command_optin_move ( msg, args ) {
		logCommand( msg, args );
		let argCount = args.length;
		if ( argCount < 3 || args[argCount - 2] !== 'to' ) {
			sendMessage_withAuthor( msg, `Usage: \`${msg.prefix}optin move <role[, ...]> to [group]\`` );
			return;
		}

		let to = args[argCount - 1];
		if ( !GROUPS.hasOwnProperty( to ) ) {
			sendMessage_withAuthor( msg, `Group \`${to}\` does not exist!` );
			return;
		}

		let toMove_list = getArgumentsAsArray( args.slice( 0, args.length - 2 ) );
		let total = toMove_list.length;

		if ( total === 0 ) {
			sendMessage_withAuthor( msg, 'No roles to move!' );
			return;
		}

		async_sendMessage_withAuthor( msg, 'Working on it...' ).then( wait_message => {
			let return_message = '```diff\n';

			let i = 0;
			for ( const roleInput of toMove_list ) {
				let roleList = getMatchingAndAddedGuildRoles( msg, roleInput );

				if ( roleList.length > 1 ) {
					return_message += `- Ambiguous input for '${roleInput}'.\n`;
					return_message += `--- Matching roles are:\n`;

					for ( const roleListElement of roleList ) {
						return_message += `--- ${roleListElement.name} (ID ${roleListElement.id})\n`;
					}

					continue;
				}

				if ( roleList.length === 0 ) {
					return_message += `- Role '${roleInput}' does not exist in the system!\n`;
					continue;
				}

				let roleToMove = roleList[0];

				let group = getGroupByRoleID( roleToMove.id );

				if ( group === to ) {
					return_message += `- Role '${roleInput}' is already in group '${to}'!\n`;
					continue;
				}

				removeGroupedRole( roleToMove.id );
				addRoleToGroup( to, roleToMove.id );

				return_message += `+ Moved '${roleInput}' to group '${to}'!\n`;
				++i;
			}

			return_message += '```\n';

			wait_message.delete();

			if ( i === 0 ) {
				sendMessage_pingAuthor( msg, `**Moved no roles.**\n` + return_message );
			} else if ( i === total ) {
				sendMessage_pingAuthor( msg, `**Moved ${i} roles.**\n` + return_message );
			} else {
				sendMessage_pingAuthor( msg, `**Moved ${i} of ${total} roles.**\n` + return_message );
			}

			saveRolesToFile();
		} );
	}

	optinCommand.registerSubcommand(
		'move',
		command_optin_move,

		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Moves one or more roles to a specified group.',
			fullDescription: 'Moves one or more roles to a specified group.',
			usage: '<role[, ...]> to <groupname>'
		}
	);

	// Region role manager
	let region = client.registerCommand(
		'region',

		//function body
		stripIndent`
            Valid subcommands:
            
            **add** - adds a new region role
            **remove** - removes a region role
            **list** - lists current region roles`,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Allows for the management of region roles. Subcommands add and remove.',
			fullDescription: 'Allows for the management of region roles.',
			usage: '<subcommand>'
		}
	);

	function command_region_add ( msg, args ) {
		logCommand( msg, args );
		args = getArgumentsAsArray( args );

		let total = args.length;
		let i = 0;

		async_sendMessage_withAuthor( msg, 'Working on it...' ).then( wait_message => {
			let return_message = '```diff\n';
			for ( const roleName of args ) {
				let roleList = getMatchingGuildRoles( msg, roleName );

				if ( roleList.length > 1 ) {
					return_message += `- Ambiguous input for '${roleName}'.\n`;
					return_message += `--- Matching roles are:\n`;

					for ( const roleListElement of roleList ) {
						return_message += `--- ${roleListElement.name} (ID ${roleListElement.id})\n`;
					}

					continue;
				}

				if ( roleList.length === 0 ) {
					msg.channel.guild.createRole( { name: roleName }, 'Creating new region role.' ).then( ( role ) => {
						// todo: add to group here
						addRoleToRegions( role.id );
						saveRolesToFile();
					} );

					return_message += `+ Created a new region role '${roleName}'!\n`;
					++i;
					continue;
				}

				let role = roleList[0];

				if ( isRegionRole( role.id ) ) {
					return_message += `- '${role.name}' is already a region role!\n`;
					continue;
				}

				let regionNotice = '';
				if ( isRegularRole( role.id ) ) {
					removeGroupedRole( role.id );
					regionNotice = ' (moved over from opt-in roles)';
				}

				addRoleToRegions( role.id );
				saveRolesToFile();

				return_message += `+ Added '${role.name}' to the list of region roles!` + regionNotice + '\n';
			}
			return_message += '```\n';

			wait_message.delete();

			if ( i === 0 ) {
				sendMessage_pingAuthor( msg, `**Added no region roles.**\n` + return_message );
			} else if ( i === total ) {
				sendMessage_pingAuthor( msg, `**Added ${i} region  roles.**\n` + return_message );
			} else {
				sendMessage_pingAuthor( msg, `**Added ${i} of ${total} region roles.**\n` + return_message );
			}

			saveRolesToFile();
		} );
	}

	// Add subcommand, adds a new opt-in role. If it doesn't already exist, a new role is created.
	region.registerSubcommand(
		'add',
		command_region_add,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Adds one or more region roles.',
			fullDescription: 'Adds one or more region roles. Can be used with existing roles or will create a new role. Will return IDs if multiple roles are found.',
			usage: '<role[, ...]>'
		}
	);

	function command_region_remove ( msg, args ) {
		logCommand( msg, args );
		args = getArgumentsAsArray( args );

		let total = args.length;
		let i = 0;

		async_sendMessage_withAuthor( msg, 'Working on it...' ).then( wait_message => {
			let return_message = '```diff\n';

			for ( const roleName of args ) {
				let roleList = getMatchingGuildRoles( msg, roleName );

				if ( roleList.length > 1 ) {
					return_message += `- Ambiguous input for '${roleName}'.\n`;
					return_message += `--- Matching roles are:\n`;

					for ( const roleListElement of roleList ) {
						return_message += `--- ${roleListElement.name} (ID ${roleListElement.id})\n`;
					}

					continue;
				}

				if ( roleList.length === 0 || !isRegionRole( roleList[0].id ) ) {
					return_message += `- '${roleName}' isn't a region role!\n`;
					continue;
				}

				let role = roleList[0];

				++i;
				removeRegionRole( role.id );

				return_message += `+ Removed '${role.name}' as a region role.\n`;
			}
			return_message += '```\n';

			wait_message.delete();

			if ( i === 0 ) {
				sendMessage_pingAuthor( msg, `**Removed no region roles.**\n` + return_message );
			} else if ( i === total ) {
				sendMessage_pingAuthor( msg, `**Removed ${i} region roles.**\n` + return_message );
			} else {
				sendMessage_pingAuthor( msg, `**Removed ${i} of ${total} region roles.**\n` + return_message );
			}

			saveRolesToFile();
		} );
	}

	region.registerSubcommand(
		'remove',
		command_region_remove,

		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Removes one or more region roles.',
			fullDescription: 'Removes one or more region roles.',
			usage: '<role[, ...]>'
		}
	);

	function command_region_list ( msg, args ) {
		logCommand( msg, args );
		let message = `**Current region roles**\n`;
		let roles = [];
		for ( const id of REGIONS ) {
			roles.push( getRoleName( msg, id ) );
		}
		roles = roles.join( ', ' );
		message += `${roles}\n\n`;

		return message;
	}

	region.registerSubcommand(
		'list',
		command_region_list,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Lists all region roles.',
			fullDescription: 'Lists all region roles.'
		}
	);

	function events_guildRoleDelete_roles ( guild, role ) {
		if ( isRegionRole( role.id ) ) {
			removeRegionRole( role.id );
			saveRolesToFile();
		}

		if ( isRegularRole( role.id ) ) {
			removeGroupedRole( role.id );
			saveRolesToFile();
		}
	}

	// catch the deletion of optin roles
	client.on( 'guildRoleDelete', events_guildRoleDelete_roles );
};