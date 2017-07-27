module.exports = (client) => {

  // Ready event
  client.on("ready", () => {
    client.log(`Ready! Logged in to Discord as ${client.user.username}#${client.user.discriminator} (${client.user.id}).`);
    client.log(`Serving ${client.users.size} users across ${client.guilds.size} servers.`);
    client.log("------------------------------");
    client.log("");
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
