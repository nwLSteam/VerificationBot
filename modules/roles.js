const jsonfile = require( 'jsonfile' );
const commonTags = require( 'common-tags' );
const path = require( 'path' );
const stripIndent = commonTags.stripIndent;
const stripIndents = commonTags.stripIndents;
const rolesPath = path.dirname( __dirname ) + '/lists/roles.json';
const groupsPath = path.dirname( __dirname ) + '/lists/groups.json';

const defaultGroup = 'Misc';

module.exports = ( client ) => {

	// Because this line of code is used way too damn much
	function saveRolesToFile () {
		jsonfile.writeFileSync( rolesPath, roles, { spaces: 4 } );
	}

	function saveGroupsToFile () {
		jsonfile.writeFileSync( groupsPath, groups, { spaces: 4 } );
	}

	// Obtain existing object, else create the file for it
	let roles;
	try {
		roles = jsonfile.readFileSync( rolesPath );
	} catch ( e ) {
		roles = {
			region: [],
			optin: []
		};

		client.warn( 'Couldn\'t find roles.json, making a new one...' );
		saveRolesToFile(); // it's basically the exact same line of code
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

	function log_to_author ( msg, message ) {
		client.createMessage( msg.channel.id, `${msg.author.username}#${msg.author.discriminator}: ${message}` );
	}

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

	function command_selfrole ( msg, args ) {
		args = args.join( ' ' );

		if ( args.length === 0 ) {
			return;
		}

		let query = msg.channel.guild.roles.filter(
			r => ( roles.region.includes( r.id ) || roles.optin.includes( r.id ) )
			     && ( r.id === args || r.name.toLowerCase() === args.toLowerCase() )
		);

		if ( query.length > 1 ) {
			let checkCaseQuery = query.filter( r => r.name === args );

			if ( checkCaseQuery.length === 1 ) {
				query = checkCaseQuery[0];
			} else {
				return stripIndents`
        There are multiple opt-in roles with this name! Use the ID instead to self assign them.
        
        ${query.map( r => `**${r.name}** -- ${r.id}` ).join( '\n' )}`;
			}
		} else if ( query.length === 1 ) {
			query = query[0];
		} else {
			return;
		}

		if ( roles.region.includes( query.id ) ) {

			let existing = msg.member.roles.filter( r => roles.region.includes( r ) );

			existing.forEach( ( roleid ) => {

				if ( roleid
				     !== query.id ) {
					msg.member.removeRole( roleid, 'Removing existing region role to add new one.' );
				}

			} );

			msg.member.addRole( query.id, 'Adding region role to user.' );

			return `${msg.author.mention}, you are now a ${query.name}!`;

		} else if ( roles.optin.includes( query.id ) ) {

			msg.member.addRole( query.id, 'Adding optin role to user.' );

			return `${msg.author.mention}, gave you the ${query.name} tag!`;

		}
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
			fullDescription: 'Give yourself one of the defined roles on the server. List roles with subcommand list. Remove roles with subcommand remove or not. You may only have one region role, but an unlimited amount of other roles.',
			usage: '<role name>'
		}
	);

	function command_selfrole_list ( msg, args ) {
		return stripIndents`
    These are the roles you may currently assign yourself.
    
    **Region Roles**
    ${roles.region.length ? roles.region.map( roleid => msg.channel.guild.roles.get( roleid ).name ).join( ', ' )
		                  : 'There are no region roles!'}
    
    **Opt-in Roles**
    ${roles.optin.length ? roles.optin.map( roleid => msg.channel.guild.roles.get( roleid ).name ).join( ', ' )
		                 : 'There are no opt-in roles!'}`;
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
		args = args.join( ' ' );
		let query = msg.channel.guild.roles.filter( r => ( roles.region.includes( r.id )
		                                                   || roles.optin.includes( r.id ) )
		                                                 && ( r.id === args
		                                                      || r.name.toLowerCase()
		                                                      === args.toLowerCase() ) );

		if ( query.length > 1 ) {

			let checkCaseQuery = query.filter( r => r.name === args );

			if ( checkCaseQuery.length === 1 ) {
				query = checkCaseQuery[0];
			} else {

				return stripIndents`
        There are multiple opt-in roles with this name! Use the ID instead to remove them.
        
        ${query.map( r => `**${r.name}** -- ${r.id}` ).join( '\n' )}`;

			}

		} else if ( query.length === 1 ) {
			query = query[0];
		} else {
			return;
		}

		if ( roles.region.includes( query.id ) || roles.optin.includes( query.id ) ) {

			msg.member.removeRole( query.id, 'Removing opt-in role from user.' );

			return `${msg.author.mention}, removed the ${query.name} tag from you!`;

		}
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
			usage: '<role name>'
		}
	);

	// Mod commands
	// These commands allow the mods to define which roles are opt ins or not.

	// Optin role manager
	let optin = client.registerCommand(
		'optin',
		// content
		stripIndent`
  Valid subcommands:
  
    **add** - adds a new opt-in role
    **remove** - removes an opt-in role
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
		args = args.join( ' ' );
		let query = msg.channel.guild.roles.filter( r => r.id === args || r.name.toLowerCase()
		                                                 === args.toLowerCase() );

		if ( query.length > 1 ) {

			let checkCaseQuery = query.filter( r => r.name === args );

			if ( checkCaseQuery.length === 1 ) {
				query = checkCaseQuery[0];
			} else {

				return stripIndents`
        You have multiple roles with the same name! Use the ID instead to add this to the list.
      
        ${query.map( r => `**${r.name}** -- ${r.id}` ).join( '\n' )}`;

			}

		} else if ( query.length === 1 ) {
			query = query[0];
		} else {

			msg.channel.guild.createRole( { name: args }, 'Creating new opt-in role.' ).then( ( role ) => {

				roles.optin.push( role.id );
				saveRolesToFile();

			} );

			return `Created a new opt-in role ${args}!`;

		}

		if ( roles.optin.includes( query.id )
		     || roles.region.includes( query.id ) ) {
			return `${query.name} is already an opt-in role!`;
		}

		roles.optin.push( query.id );
		saveRolesToFile();

		return `Added ${query.name} to the list of opt-in roles!`;

	}

	// Add subcommand, adds a new opt-in role. If it doesn't already exist, a new role is created.
	optin.registerSubcommand(
		'add',
		command_optin_add,

		// command options
		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Adds an opt-in role.',
			fullDescription: 'Adds an opt-in role. Can be used with existing roles or will create a new role. Will return IDs if multiple roles are found.',
			usage: '<role name or id>'
		}
	);

	function command_optin_remove ( msg, args ) {
		args = args.join( ' ' );
		let query = msg.channel.guild.roles.filter( r => roles.optin.includes( r.id )
		                                                 && ( r.id === args
		                                                      || r.name.toLowerCase()
		                                                      === args.toLowerCase() ) );

		if ( query.length > 1 ) {

			let checkCaseQuery = query.filter( r => r.name === args );

			if ( checkCaseQuery.length === 1 ) {
				checkCaseQuery = checkCaseQuery[0];
			} else {

				return stripIndents`
        You have multiple roles with the same name! Use the ID instead to add this to the list.
      
        ${query.map( r => `${r.name} -- ${r.id}` ).join( '\n' )}`;

			}

		} else if ( query.length === 1 ) {
			query = query[0];
		} else {
			return `${args} isn't an opt-in role!`;
		}

		roles.optin.splice( roles.optin.indexOf( query.id ), 1 );
		saveRolesToFile();

		return `Removed ${query.name} as an opt-in role.`;

	}

	optin.registerSubcommand(
		'remove',
		command_optin_remove,

		{
			requirements: {
				userIDs: [ client.config.ownerID ],
				roleIDs: [ client.config.modsRoleID ]
			},

			guildOnly: true,
			description: 'Removes an opt-in role.',
			fullDescription: 'Removes an opt-in role.',
			usage: '<role name or id>'
		}
	);

	function command_optin_list ( msg, args ) {
		return roles.optin.length ? stripIndents`
    These are the current opt-in roles.
    
    ${roles.optin.map( roleid => `**${msg.channel.guild.roles.get( roleid ).name}** - ${roleid}` ).join( '\n' )}`
		                          : 'There are no opt-in roles!';
	}

	optin.registerSubcommand(
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
		args = args.join( ' ' );
		let query = msg.channel.guild.roles.filter( r => r.id === args
		                                                 || r.name.toLowerCase()
		                                                 === args.toLowerCase() );

		if ( query.length > 1 ) {

			let checkCaseQuery = query.filter( r => r.name === args );

			if ( checkCaseQuery.length === 1 ) {
				query = checkCaseQuery[0];
			} else {

				return stripIndents`
        You have multiple roles with the same name! Use the ID instead to add this to the list.
      
        ${query.map( r => `**${r.name}** -- ${r.id}` ).join( '\n' )}`;

			}

		} else if ( query.length === 1 ) {
			query = query[0];
		} else {

			msg.channel.guild.createRole( { name: args }, 'Creating new region role.' ).then( ( role ) => {

				roles.region.push( role.id );
				saveRolesToFile();

			} );

			return `Created a new region role ${args}!`;

		}

		if ( roles.optin.includes( query.id )
		     || roles.region.includes( query.id ) ) {
			return `${query.name} is already an opt-in role!`;
		}

		roles.region.push( query.id );
		saveRolesToFile();

		return `Added ${query.name} to the list of region roles!`;
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
			description: 'Adds a region role.',
			fullDescription: 'Adds a region role. Can be used with existing roles or will create a new role. Will return IDs if multiple roles are found.',
			usage: '<role name or id>'
		}
	);

	function command_region_remove ( msg, args ) {
		args = args.join( ' ' );
		let query = msg.channel.guild.roles.filter( r => roles.region.includes( r.id )
		                                                 && ( r.id === args
		                                                      || r.name.toLowerCase()
		                                                      === args.toLowerCase() ) );

		if ( query.length > 1 ) {

			let checkCaseQuery = query.filter( r => r.name === args );

			if ( checkCaseQuery.length === 1 ) {
				checkCaseQuery = checkCaseQuery[0];
			} else {

				return stripIndents`
        You have multiple roles with the same name! Use the ID instead to add this to the list.
      
        ${query.map( r => `**${r.name}** -- ${r.id}` ).join( '\n' )}`;

			}

		} else if ( query.length === 1 ) {
			query = query[0];
		} else {
			return `${args} isn't a region role!`;
		}

		roles.region.splice( roles.region.indexOf( query.id ), 1 );
		saveRolesToFile();

		return `Removed ${query.name} as a region role.`;
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
			description: 'Removes a region role.',
			fullDescription: 'Removes a region role.',
			usage: '<role name or id>'
		}
	);

	function command_region_list ( msg ) {
		return roles.region.length ? stripIndents`
    These are the current region roles.
    
    ${roles.region.map( roleid => `**${msg.channel.guild.roles.get( roleid ).name}** - ${roleid}` ).join( '\n' )}`
		                           : 'There are no region roles!';

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

	function roles_event_guildRoleDelete ( guild, role ) {
		if ( roles.optin.includes( role.id ) ) {
			roles.optin.splice( roles.optin.indexOf( role.id ), 1 );
			saveRolesToFile();
		}

		if ( roles.region.includes( role.id ) ) {
			roles.region.splice( roles.region.indexOf( role.id ), 1 );
			saveRolesToFile();
		}
	}

	// catch the deletion of optin roles
	client.on( 'guildRoleDelete', roles_event_guildRoleDelete );
};