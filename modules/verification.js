const moment = require("moment");
const stripIndent = require("common-tags").stripIndents;
module.exports = (client) => {

  // Verification process

  // User join
  // Block the user from reading the bot offline channel
  // Allow the user to read the rules lite channel
  // Send them a direct message telling them to read the rules
  // Log it in the logging channel (if specified in the config)
  client.on("guildMemberAdd", (guild, member) => {
    client.editChannelPermission(client.config.botOfflineChannelID, member.id, 0, 1024, "member", "New user joined, set up verification process.").catch((err) => client.error(`Error occured while changing channel permissions: ${err}`));
    client.editChannelPermission(client.config.rulesChannelID, member.id, 1024, 0, "member", "New user joined, set up verification process.").catch((err) => client.error(`Error occured while changing channel permissions: ${err}`));
    client.getDMChannel(member.id).then((channel) => {
      client.createMessage(channel.id, client.config.joinMsg.replace("<s>", guild.name).replace("<r>", `<#${client.config.rulesChannelID}>`)).catch((err) => client.error(`Error occured while sending message to user: ${err}`));
    }).catch((err) => client.error(`Error occured when obtaining DM channel: ${err}`));

    if (client.config.logChannelID) {
      client.createMessage(client.config.logChannelID, {
        embed: {
          author: {
            name: `${member.username}#${member.discriminator} (${member.id})`,
            icon_url: member.user.dynamicAvatarURL("png", 512)
          },
          description: moment().isBefore(moment(member.createdAt).add(1, "days")) ? ":warning: This user is less than one day old!" : "",
          footer: {
            text: "User Joined",
          },
          timestamp: new Date(),
          color: 52479, // #00CCFF, light blue
          type: "rich"
        }
      }).catch((err) => client.error(`Error when creating log embed: ${err}`));
    }

    client.log(`${member.username}#${member.discriminator} (${member.id}) joined the server.`);
  });

  // User messages the bot
  // If the verification phrase is entered correctly,
  // Ensure that the user hasn't already been verified
  // Add the user to the member role
  // Clean up the user specific channel permissions
  // Send them a direct message welcoming them to the server and inviting them to introduce themself.
  // Log it in the logging channel (if specified in the config)
  client.on("messageCreate", (msg) => {
    if (!msg.channel.guild) {
      // If in the guild the member already has a role (roles list > 0), return
      if (client.guilds.find((guild) => guild.id === client.config.guildID).members.find((member) => member.id === msg.author.id).roles.length != 0) return;
      if (client.config.verificationPhrases.includes(msg.content.toLowerCase())) {
        client.addGuildMemberRole(client.config.guildID, msg.author.id, client.config.memberRoleID, "Verification process complete, adding user to member role.").then(() => {
          client.deleteChannelPermission(client.config.botOfflineChannelID, msg.author.id, "Verification process complete, cleaning up.").catch((err) => client.error(`Error occured while deleting channel permissions: ${err}`));
          client.deleteChannelPermission(client.config.rulesChannelID, msg.author.id, "Verification process complete, cleaning up.").catch((err) => client.error(`Error occured while deleting channel permissions: ${err}`));
          client.getDMChannel(msg.author.id).then((channel) => {
            client.createMessage(channel.id, client.config.welcomeMsg.replace("<s>", client.guilds.find((guild) => guild.id === client.config.guildID).name).replace("<i>", `<#${client.config.introductionsChannelID}>`)).catch((err) => client.error(`Error occured while sending message to user: ${err}`));
          }).catch((err) => client.error(`Error occured when obtaining DM channel: ${err}`));
        }).catch((err) => client.error(`Error occured when adding role to member: ${err}`));

        if (client.config.logChannelID) {
          client.createMessage(client.config.logChannelID, {
            embed: {
              author: {
                name: `${msg.author.username}#${msg.author.discriminator} (${msg.author.id})`,
                icon_url: msg.author.dynamicAvatarURL("png", 512)
              },
              footer: {
                text: "Verification Complete",
              },
              timestamp: new Date(),
              color: 8978176, // #88FF00, light green
              type: "rich"
            }
          }).catch((err) => client.error(`Error when creating log embed: ${err}`));
        }

        client.log(`${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) completed verification.`);
      }
    }
  });

  // Verification purge function
  // Ensure that the guild exists
  // Grabs every single user that does not have roles and saves the size of the collection
  // Loops through the collection and kicks each member
  // Logs it in the logging channel (if specified in the config)
  function verificationPurge() {
    client.log("Performing verification purge!");
    let guild = client.guilds.find((guild) => guild.id === client.config.guildID);

    if (!guild) {
      client.error("Cannot find the guild that is specified in the config!");
      return;
    }

    let kickMembers = guild.members.filter((member) => member.roles.length === 0);
    let memberCount = kickMembers.length ? kickMembers.length : "No";

    kickMembers.forEach((member) => {
      member.kick("Member failed verification test, kicking from the server.").catch((err) => client.error(`Error when kicking user: ${err}`));
    });

    if (client.config.logChannelID) {
      client.createMessage(client.config.logChannelID, {
        embed: {
          author: {
            name: `${client.user.username}#${client.user.discriminator} (${client.user.id})`,
            icon_url: client.user.dynamicAvatarURL("png", 512)
          },
          description: `Verification purge has been performed. ${memberCount} users were kicked. The next automated purge is ${client.nextPurge.fromNow()} (${client.nextPurge.format("HH:mm:ss Z")})`,
          footer: {
            text: "Verification Purge",
          },
          timestamp: new Date(),
          color: 16711680, // #FF0000, red
          type: "rich"
        }
      }).catch((err) => client.error(`Error when creating log embed: ${err}`));
    }

    client.log(`Verification purge has been performed. ${memberCount} users were kicked. The next automated purge is ${client.nextPurge.fromNow()} (${client.nextPurge.format("HH:mm:ss Z")})`);
  }

  // 6 hour timer helper
  // Purely visual and not actually vital to any part of the program.
  // Makes sure that the next purge is always updated before running verification purge
  function sixHourTimer() {
    client.nextPurge = moment().add(6, "hours");
    verificationPurge();
  }

  // Verification setup function
  // Ensure the guild exists
  // Get all members who have no roles
  // Ensure that they do not already have permission overwrite set up for them
  // Set up their permission overwrites and send them a DM
  // Log it in the logging channel (if specified in the config)
  function verificationSetup() {
    client.log("Performing verification setup!");

    let guild = client.guilds.find((guild) => guild.id === client.config.guildID);

    if (!guild) {
      client.error("Cannot find the guild that is specified in the config!");
      return;
    }

    let verifyMembers = guild.members.filter((member) => member.roles.length === 0);
    let memberCount = verifyMembers.length ? verifyMembers.length : "No";

    verifyMembers.forEach((member) => {
      if (client.getChannel(client.config.botOfflineChannelID).permissionOverwrites.find(member.id) && client.getChannel(client.config.rulesChannelID).permissionOverwrites.find(member.id)) return;
      client.editChannelPermission(client.config.botOfflineChannelID, member.id, 0, 1024, "member", "Bot restarted, setting up verification process.").catch((err) => client.error(`Error occured while changing channel permissions: ${err}`));
      client.editChannelPermission(client.config.rulesChannelID, member.id, 1024, 0, "member", "Bot restarted, setting up verification process.").catch((err) => client.error(`Error occured while changing channel permissions: ${err}`));
      client.getDMChannel(member.id).then((channel) => {
        client.createMessage(channel.id, "I am back online! Thank you for your patience.\n" + client.config.joinMsg.replace("<s>", guild.name).replace("<r>", `<#${client.config.rulesChannelID}>`)).catch((err) => client.error(`Error occured while sending message to user: ${err}`));
      }).catch((err) => client.error(`Error occured when obtaining DM channel: ${err}`));
    });

    if (client.config.logChannelID) {
      client.createMessage(client.config.logChannelID, {
        embed: {
          author: {
            name: `${client.user.username}#${client.user.discriminator} (${client.user.id})`,
            icon_url: client.user.dynamicAvatarURL("png", 512)
          },
          description: `Verification setup is complete. ${memberCount} users need to be verified. The next automated purge is ${client.nextPurge.fromNow()} (${client.nextPurge.format("HH:mm:ss Z")})`,
          footer: {
            text: "Verification Setup",
          },
          timestamp: new Date(),
          color: 52479, // #00CCFF, light blue
          type: "rich"
        }
      }).catch((err) => client.error(`Error when creating log embed: ${err}`));
    }

    client.log(`Verification setup is complete. ${memberCount} users need to be verified. The next automated purge is ${client.nextPurge.fromNow()} (${client.nextPurge.format("HH:mm:ss Z")})`);
  }

  // On ready
  client.on("ready", () => {

    // Initialize the 6 hour timer
    setInterval(sixHourTimer, 6 * 60 * 60 * 1000) // 6 hours * 60 minutes * 60 seconds * 1000 milliseconds
    client.nextPurge = moment().add(6, "hours");

    // Run verification setup
    verificationSetup();

  });

  // Commands

  // Verification main command
  client.registerCommand("verification",

  // Message reply for verification command
  stripIndent`
    **Verification Subcommands**

      **purge**: performs the verification purge, kicking any users without a role
      **setup**: performs the verification setup, giving any users without a role the specific channel permissions in order to be verified properly.
  `,

  // command options
  {
    aliases: [ "verify", "veri" ],
    description: "Main verification command.",
    fullDescription: "Main verification command, use the subcommands.",
    usage: "<subcommand>",
    requirements: {
      roleIDs: [ client.config.modsRoleID ],
    },
  })

  // purge subcommand
  .registerSubcommand("purge",

  // message prompt for confirmation
  stripIndent`
    Are you sure? This will kick any user that does not have a role.

    You have a minute to make a decision.
  `,

  // command options
  {
    aliases: [ "kick" ],
    description: "Kicks non-verified users.",
    fullDescription: "Kicks any users that have not followed the verification procedure. This is automatically run every 6 hours.",
    requirements: {
      roleIDs: [ client.config.modsRoleID ],
    },
    reactionButtons: [
      // yes button
      {
        emoji: "yes:334952191351717899",
        type: "edit",
        response: (msg, args) => {
          verificationPurge();
          return "Purging non-verified users...";
        }
      },

      // no button
      {
        emoji: "no:315210386255380481",
        type: "edit",
        response: "Canceling purge..."
      }
    ]
  })

  // setup subcommand
  .registerSubcommand("setup",

  // performs set up
  (msg, args) => {
    verificationSetup();
    return "Performing setup..."
  },

  // command options
  {
    aliases: [ "init", "initialize" ],
    description: "Performs verification setup.",
    fullDescription: "Gives anyone who does not have any roles the necessary permissions to see the verification rules channel.",
    requirements: {
      roleIDs: [ client.config.modsRoleID ],
    }
  });

};
