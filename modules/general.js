const moment = require("moment");

module.exports = (client) => {

  // Ready event
  client.on("ready", () => {

    client.log(`Ready! Logged in to Discord as ${client.user.username}#${client.user.discriminator} (${client.user.id}).`);
    client.log(`Serving ${client.users.size} users across ${client.guilds.size} servers.`);
    client.log("------------------------------");
    client.log("");

    if (client.config.logChannelID) {

      client.createMessage(client.config.logChannelID, {

        embed: {

          author: {

            name: `${client.user.username}#${client.user.discriminator} (${client.user.id})`,
            icon_url: client.user.dynamicAvatarURL("png", 512)

          },

          footer: {

            text: "Bot Online",

          },

          timestamp: new Date(),
          color: 8978176, // #88FF00, light green
          type: "rich"

        }

      }).catch((err) => client.error(`Error when creating log embed: ${err}`));

    }

  });

  // User joins server
  // Logs it in the logging channel
  client.on("guildMemberAdd", (guild, member) => {

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

  // User leaves server
  // Check to make sure the avatar url can be obtained
  // Log it in the logging channel (if specified in the config)
  client.on("guildMemberRemove", (guild, member) => {

    if (client.config.logChannelID) {

      let avatarURL = "";

      try {

        avatarURL = msg.member.user.dynamicAvatarURL("png", 512);

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

      }).catch((err) => client.error(`Error when creating log embed: ${err}`));

    }

    client.log(`${member.username}#${member.discriminator} (${member.id}) left the server.`);

  });

};
