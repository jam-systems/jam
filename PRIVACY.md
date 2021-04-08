Privacy Considerations for Jam
==============================

No Analytics
------------

Jam does not use any analytics provider and we do not store IP addresses in the logs. Jam does not give any user data to third parties.

What is stored on the backend and why
-------------------------------------

### For participants

- The name people give themselves (if they do). This is so you don't have to set your name in each new room on one instance
- The profile picture people add (if they do). This is used to display the picture on your avatar.
None of this data is mandatory though.

### For rooms

- The room name, description and url. This is to allow people who join to query it
- The list of speakers and mods. This is to make it possible to leave a room and come back and still keep your role.


Conversation privacy
--------------------

- Everyone who knows the room url can listen to the conversation
- So can the administrator of the instance as all room urls are stored on the backend
- Any consideration regarding WebRTC IP address leaks apply

Metadata privacy
----------------

- In a room every participant has access to the names and profile pictures the other participants set for themselves


Other ideas
-----------

- Allow moderators to delete the room data when it is not needed anymore (Important: disallow recreation of room with the same id to avoid room impersonation)

Self Hosting
------------

Most eventual privacy concerns can be addressed by hosting your own instance and only giving the link of your room to trusted individuals.

