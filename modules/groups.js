const jsonfile = require( 'jsonfile' );
const commonTags = require( 'common-tags' );
const path = require( 'path' );
const stripIndent = commonTags.stripIndent;
const groupsPath = path.dirname( __dirname ) + '/lists/groups.json';

const defaultGroup = 'Misc';

module.exports = ( client ) => {
	function saveGroupsToFile () {
		jsonfile.writeFileSync( groupsPath, groups, { spaces: 4 } );
	}

	function log_to_author ( msg, message ) {
		client.createMessage( msg.channel.id, `${msg.author.username}#${msg.author.discriminator}: ${message}` );
	}

	let groups;
	try {
		groups = jsonfile.readFileSync( groupsPath );
		if ( !groups.hasOwnProperty( `${defaultGroup}` ) ) {
			groups[`${defaultGroup}`] = [];
			saveGroupsToFile();
		}
	} catch ( e ) {
		groups = {};
		groups[`${defaultGroup}`] = [];

		client.warn( 'Couldn\'t find groups.json, making a new one...' );
		saveGroupsToFile(); // it's basically the exact same line of code
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

	function command_groups_add ( msg, args ) {
		let total = args.length;
		let i = 0;
		for ( const toAdd of args ) {
			if ( groups.hasOwnProperty( `${toAdd}` ) ) {
				client.createMessage( msg.channel.id, `Group ${toAdd} already exists!` );
				continue;
			}

			++i;
			groups[`${toAdd}`] = [];
			client.createMessage( msg.channel.id, `Added group ${toAdd}!` );
		}

		if ( i === 0 ) {
			client.createMessage( msg.channel.id, `${msg.author.mention}: **Added no groups.**` );
		} else if ( i === total ) {
			client.createMessage( msg.channel.id, `${msg.author.mention}: **Added ${i} groups.**.` );
		} else {
			client.createMessage( msg.channel.id, `${msg.author.mention}: **Added ${i} of ${total} groups.**` );
		}
		saveGroupsToFile();
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
			usage: '<groupname ...>'
		}
	);

	function command_groups_remove ( msg, args ) {
		let total = args.length;
		let i = 0;
		let moved = 0;
		for ( const toRemove of args ) {

			if ( toRemove === defaultGroup ) {
				client.createMessage( msg.channel.id, `Cannot remove default group "${defaultGroup}"!` );
				continue;
			}

			if ( !groups.hasOwnProperty( `${toRemove}` ) ) {
				client.createMessage( msg.channel.id, `Group ${toRemove} does not exist!` );
				continue;
			}

			++i;

			let content_count = groups[`${toRemove}`].length;
			if ( content_count > 0 ) {
				// make sure the roles are moved back to the default group
				groups[`${defaultGroup}`] = groups[`${defaultGroup}`].concat( groups[`${toRemove}`] );
				client.createMessage(
					msg.channel.id,
					`Deleted group ${toRemove} and moved ${content_count} roles to default group "${defaultGroup}"!`
				);
				moved += content_count;
			} else {
				client.createMessage( msg.channel.id, `Deleted group ${toRemove}!` );
			}
			delete groups[`${toRemove}`];

		}

		let moved_message = moved > 0 ? ` Moved ${moved} back to default group "${defaultGroup}"` : '';

		if ( i === 0 ) {
			client.createMessage( msg.channel.id, `${msg.author.mention}: **Removed no groups.**` );
		} else if ( i === total ) {
			client.createMessage( msg.channel.id, `${msg.author.mention}: **Removed ${i} groups.**.` + moved_message );
		} else {
			client.createMessage(
				msg.channel.id,
				`${msg.author.mention}: **Removed ${i} of ${total} groups.**` + moved_message
			);
		}
		saveGroupsToFile();
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
			usage: '<groupname ...>'
		}
	);

	function command_groups_list () {
		let message = '**Current groups:**\n';
		for ( const group in groups ) {
			message += `- ${group}`;
			if ( group === defaultGroup ) {
				message += ' **(default group)**';
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

	function command_groups_merge ( msg, args ) {
		let total = args.length;
		if ( total !== 3 || args[1] !== 'to' ) {
			return 'Usage: `groups merge [from] into [to]`';
		}

		let from = args[0];
		if ( !groups.hasOwnProperty( from ) ) {
			return `Group "${from}" does not exist!`;
		}

		let to = args[2];
		if ( !groups.hasOwnProperty( to ) ) {
			return `Group "${to}" does not exist!`;
		}

		if ( from === to ) {
			return 'The groups are the same!';
		}

		let count = groups[from].length;

		if ( count === 0 ) {
			return `Group "${from}" has no roles to move!`;
		}

		groups[to] = groups[to].append( groups[from] );
		groups[from] = [];

		return `Moved ${count} roles from group "${from}" to group "${to}"!`;
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
			description: 'Moves all roles from one group to another.',
			fullDescription: 'Moves all roles from one group to another. Does not delete groups.',
			usage: '<groupname> to <groupname>'
		}
	);

	function command_groups_yoink ( msg, args ) {
		let argCount = args.length;
		if ( argCount < 3 || args[argCount - 2] !== 'to' ) {
			log_to_author( msg, 'Usage: `groups yoink [roles...] to [group]`' );
			return;
		}

		let to = args[argCount - 1];
		if ( !groups.hasOwnProperty( to ) ) {
			log_to_author( msg, `Group \`${to}\` does not exist!` );
			return;
		}

		let toMove_list = args.slice( 0, args.length - 2 );
		let total = toMove_list.length;

		if ( total === 0 ) {
			log_to_author( msg, 'No roles to move!' );
			return;
		}

		log_to_author( msg, 'Working on it...' );

		let return_message = '```diff\n';

		let i = 0;
		roleLoop: for ( const roleToMove of toMove_list ) {
			if ( groups[to].includes( roleToMove ) ) {
				return_message += `- Role '${roleToMove}' is already in group '${to}'!\n`;
				continue;
			}

			// search through all roles for the role

			for ( const currentGroup_name in groups ) {
				if ( currentGroup_name === to ) {
					continue;
				}

				let currentGroup_roleList = groups[currentGroup_name];
				let roleIndex = currentGroup_roleList.indexOf( roleToMove );
				if ( roleIndex !== -1 ) {
					currentGroup_roleList.splice( roleIndex, 1 );
					groups[to].push( roleToMove );

					return_message += `+ Moved '${roleToMove}' to group '${to}'!\n`;

					++i;
					continue roleLoop;
				}
			}

			return_message += `- Role '${roleToMove}' does not exist in the system!\n`;
		}

		return_message += '```\n';

		if ( i === 0 ) {
			return_message = `${msg.author.mention}: **Moved no roles.**\n` + return_message;
		} else if ( i === total ) {
			return_message = `${msg.author.mention}: **Moved ${i} roles.**.\n` + return_message;
		} else {
			return_message = `${msg.author.mention}: **Moved ${i} of ${total} roles.**\n` + return_message;
		}

		client.createMessage( msg.channel.id, return_message );
		saveGroupsToFile();
	}

	groupsCommand.registerSubcommand(
		'yoink',
		command_groups_yoink,

		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Yoinks one or more roles to a specified group.',
			fullDescription: 'Yoinks one or more roles to a specified group.',
			usage: '<groupname> to <groupname>'
		}
	);
};