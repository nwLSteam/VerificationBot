// Libraries
const Eris = require("eris");
const chalk = require("chalk");
const moment = require("moment");
const config = require("./config");

// Intiialize the client
const client = new Eris.CommandClient(
  // Discord token
  config.discordToken,

  // Client options
  {
    disableEvents: {
      TYPING_START: true,
  },

  // Command options
  {
    description: "A bot made by Visate#7752 (ID: 97198953430257664)\n\nPM @Visate#7752 if you have any suggestions for the bot!",
    owner: "",
    prefix: config.prefixes,
    defaultCommandOptions: {
      caseInsensitive: true,
    }
  }
});

// Attach the config to the client
client.config = config;

// Logging methods
client.log = (...msg) => console.log(chalk.green.bold(`[LOG] [${moment().format("MMM DD HH:mm:ss")}]`), ...msg);
client.error = (...msg) => console.log(chalk.bgRed.white.bold(`[ERR] [${moment().format("MMM DD HH:mm:ss")}]`), ...msg);
client.warn = (...msg) => console.log(chalk.bgYellow.white.bold(`[WRN] [${moment().format("MMM DD HH:mm:ss")}]`), ...msg);

// Ready event
client.on("ready", () => {
  client.log(`Ready! Logged in to Discord as ${client.user.username}#${client.user.discriminator} (${client.user.id}).`);
  client.log(`Serving ${client.users.size} users across ${client.guilds.size} servers.`);
  client.log("------------------------------");
  client.log("");

  // Performs user purge once client is ready
  client.log("Performing client launch verification purge...!");
  verificationPurge();
});

// Verification process
// User join
// Block the user from reading the bot offline channel
// Allow the user to read the rules lite channel
// Send them a direct message telling them to read the rules
// Log it in the logging channel (if specified in the config)
client.on("guildMemberAdd", (guild, member) => {
  client.editChannelPermission(client.config.botOfflineChannelID, member.id, 0, 1024, "member", "New user joined, set up verification process.");
  client.editChannelPermission(client.config.rulesChannelID, member.id, 1024, 0, "member", "New user joined, set up verification process.");
  client.createMessage(client.getDMChannel(member.id), client.config.joinMsg.replace("<s>", guild.name).replace("<r>", `<#${client.config.rulesChannelID}>`));

  if (client.config.logChannelID) {
    client.createMessage(client.config.logChannelID, {
      embed: {
        author: {
          name: `${member.username}#${member.discriminator} (${member.id})`,
          icon_url: member.dynamicAvatarURL("png", 512)
        },
        description: moment().isBefore(moment(member.createdAt).add(1, "days")) ? ":warning: This user is less than one day old!" : "",
        footer: {
          text: "User Joined",
        },
        timestamp: new Date(),
        color: 52479, // #00CCFF, light blue
        type: "rich"
      }
    });
  }

  client.log(`${member.username}#${member.discriminator} (${member.id}) joined the server.`);
});

// User messages the bot
// If the verification phrase is entered correctly,
// Add the user to the member role
// Clean up the user specific channel permissions
// Send them a direct message welcoming them to the server and inviting them to introduce themself.
// Log it in the logging channel (if specified in the config)
client.on("messageCreate", (msg) => {
  if (!msg.channel.guild) {
    if (client.config.verificationPhrases.includes(msg.content.toLowerCase())) {
      client.addGuildMemberRole(client.config.guildID, msg.author.id, client.config.memberRoleID, "Verification process complete, adding user to member role.");
      client.deleteChannelPermission(client.config.botOfflineChannelID, msg.author.id, "Verification process complete, cleaning up.");
      client.deleteChannelPermission(client.config.rulesChannelID, msg.author.id, "Verification process complete, cleaning up.");
      client.createMessage(client.getDMChannel(msg.author.id), client.config.welcomeMsg.replace("<s>", msg.channel.guild.name).replace("<i>", `<#${client.config.introductionsChannelID}>`));

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
        });
      }

      client.log(`${msg.author.username}#${msg.author.discriminator} (${msg.author.id}) completed verification.`);
    }
  }
});

// Additional events
// User leaves server
// Check to make sure the avatar url can be obtained
// Log it in the logging channel (if specified in the config)
client.on("guildMemberRemove", (guild, member) => {
  if (client.config.logChannelID) {

    let avatarURL = "";
    try {
      avatarURL = msg.member.dynamicAvatarURL("png", 512);
    }
    catch (e) {
      avatarURL = "";
    }

    client.createMessage(client.config.logChannelID, {
      embed: {
        author: {
          name: `${member.username}#${member.discriminator} (${member.id})`,
          icon_url: avatarURL
        },
        footer: {
          text: "User Left",
        },
        timestamp: new Date(),
        color: 16755200, // #FFAA00, orange
        type: "rich"
      }
    });
  }

  client.log(`${member.username}#${member.discriminator} (${member.id}) left the server.`);
})

// Verification purge function
// Grabs every single user that does not have roles and saves the size of the collection
// Loops through the collection and kicks each member
// Logs it in the logging channel (if specified in the config)
function verificationPurge() {
  let guild = client.guilds.find((guild) => guild.id === client.config.guildID);

  if (!guild) {
    client.error("Cannot find the guild that is specified in the config!");
    return;
  }

  let kickMembers = guild.members.filter((member) => member.roles === []);
  let memberCount = kickMembers.size;

  kickMembers.forEach((member) => {
    member.kick("Member failed verification test, kicking from the server.");
  });

  if (client.config.logChannelID) {
    client.createMessage(config.logChannelID, {
      embed: {
        author: {
          name: client.user.username,
          icon_url: client.user.dynamicAvatarURL("png", 512)
        },
        description: `Verification purge has been performed. ${memberCount} users were kicked. The next purge is in 6 hours (${moment.add(6, "hours").format("HH:mm Z")})`,
        footer: {
          text: "Verification Purge",
        },
        timestamp: new Date(),
        color: 16711680, // #FF0000, red
        type: "rich"
      }
    });
  }

  client.log(`Verification purge has been performed. ${memberCount} users were kicked. The next purge is in 6 hours (${moment.add(6, "hours").format("HH:mm:ss Z")})`);
}

// Initialize the 6 hour timer
setInterval(verificationPurge, 6 * 60 * 60 * 1000) // 6 hours * 60 minutes * 60 seconds * 1000 milliseconds

// Connect the client
client.connect();
