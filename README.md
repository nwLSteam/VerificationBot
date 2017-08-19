VerificationBot
---

A verification bot for Discord servers built using the [Eris](https://github.com/abalabahaha/eris) library for Discord API.

Server Roles
---
A Moderators role and a Members role should exist on the server. These may be named whatever you like and can be configured in the config.

Channels
---
The server should have the following channels for the best results

* the bot is dead channel

  This channel states that the bot is dead and the user should message a mod about it being dead.

  This channel's permissions are:

  * @everyone **can** Read Messages and **cannot** Send Messages
  * Member **cannot** Read Messages

* rules lite channel

  This is the verification rules channel, or rules lite for short. This should just be the rules and nothing extra about the server to ensure that the rules are read and not any of the other server specific stuff.

  This channel's permissions are:

  * @everyone **cannot** Read and Send Messages

* rules and more info channel

   This is basically the rules channel but with more info or just the same as the rules lite channel.

   This also helps prevents DMs to your regular userbase during the verification phase.


* logging channel

  This is just where information is logged. If the channel isn't specified, no logging is performed.


* introductions channel

  This can be whatever channel you like, i.e. the actual introductions channel or the general channel or whatever


* general channel

  This is the primary speaking channel.

  This channel's permissions are:

  * @everyone **cannot** Read and Send Messages
  * Member **can** Read and Send Messages

Config Options
---
* discordToken: the token of your bot


* prefixes: prefixes for the commands the bot has


* ownerID: ID of the owner of the bot


* guildID: ID of the guild verification will be performed in


* botOfflineChannelID: ID of the channel that states that the bot is offline


* rulesChannelID: ID of the rules lite channel


* introductionsChannelID: ID of the introductions channel


* logChannelID: ID of the logging channel (optional)


* memberRoleID: ID of the member role


* modsRoleID: ID of the mods role


* verificationPhrases: a list of all the acceptable phrases for verification


* welcomeMsg: a direct message sent after the user has been verified, \<s> replaces with the server name and \<i> replaces with the introductions channel

How does it work?
---
On join, the bot blocks the user from seeing the bot is dead channel and adds the user to the specified rules channel through user specific permissions. Inside this channel, somewhere there should be a verification code/phrase. This code/phrase must be DM'd to the bot and it will then remove the user from that channel, and grant them the specified Member role, which gives them access to the rest of the server.

All of the options are customizable. The bot should, and is best used on just one server.

Additional Things
---
#### Self-Assignable Roles System

This bot includes a selfrole command! The roles may be manually added to the /lists/roles.json file manually with IDs or added using the region and optin commands respectively. The difference between the two types being that there may be only one instance of a region role on a user, while as many as you want of normal opt-in roles. Just don't accidentally make your mods role an opt-in (it's okay, just don't put the bot's role above it)

Not So Frequently Asked Questions
---
#### Q: Why not have a Verification role that isolates the user instead?

A: This is because of the way Discord's verification system works. Since adding a role to a user completely defeats the purpose of the verification level, by removing that need it allows for the verification levels to work properly.

To Do
---
* Write the bot ✅
* Verification System ✅
* Self role system ✅
* Do the set up on bot join
* Anti-raid measures
