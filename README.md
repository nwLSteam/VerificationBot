VerificationBot
---

A verification bot for Discord servers built using the [Eris](https://github.com/abalabahaha/eris) library for Discord API.

Server Permissions
---
In order to allow for maximum security of the server, the following things have to be adjusted in the server's permissions.

@everyone role:
The Read Messages and Connect permissions must be REVOKED.

Member role:
This role returns the permissions to the user. This role can be configured/customized.

Channels
---
The server should have the following channels for the best results

* the bot is dead channel

  This channel states that the bot is dead and the user should message a mod about it being dead.

  This channel's permissions are:

  * @everyone **can** Read Messages and **cannot** Send Messages
  * Member **cannot** Read Messages

* rules channel

  This is the verification rules channel, or rules lite for short. This should just be the rules and nothing extra about the server to ensure that the rules are read and not any of the other server specific stuff.

  This channel's permissions are:

  * @everyone **cannot** Read and Send Messages
  * Member **cannot** Read Messages

* rules and more info channel

   This is basically the rules channel but with more info or just the same as the rules lite channel.

   This is necessary because this also prevents DMs to your regular userbase during the verification phase.


* introductions channel

  This can be whatever channel you like, i.e. the actual introductions channel or the general channel or whatever

Config Options
---
* discordToken: the token of your bot


* prefixes: prefixes for the commands the bot has


* guildID: ID of the guild verification will be performed in


* botOfflineChannelID: ID of the channel that states that the bot is offline


* rulesChannelID: ID of the rules lite channel


* introductionsChannelID: ID of the introductions channel


* logChannelID: ID of the logging channel (optional)


* memberRoleID: ID of the member role


* modsRoleID: ID of the mods role


* verificationPhrases: an list of all the acceptable phrases for verification


* joinMsg: a direct message sent to the user on join, \<s> replaces with the server name and \<r> replaces with the rules channel


* welcomeMsg: a direct message sent after the user has been verified, \<s> replaces with the server name and \<i> replaces with the introductions channel

How does it work?
---
On join, the bot blocks the user from seeing the bot is dead channel and adds the user to the specified rules channel through user specific permissions. Inside this channel, somewhere there should be a verification code/phrase. This code/phrase must be DM'd to the bot and it will then remove the user from that channel, and grant them the specified Member role, which gives them access to the rest of the server.

All of the options are customizable. The bot should, and is best used on just one server.

FAQ
---
#### Q: Why do you need to remove the read messages and speak permissions?

A: By removing the read messages permission, it prevents the user from seeing any channel except for the ones they are added to by roles or channel specific permissions. The speak permission does the same thing except with voice channels.

#### Q: Why not have a Verification role that isolates the user instead?

A: This is because of the way Discord's verification system works. Since adding a role to a user completely defeats the purpose of the verification level, by removing that need it allows for the verification levels to work properly.

To Do
---
* Write the bot
* Make the config more robust
* Do the set up on bot join
* Anti-raid measures
