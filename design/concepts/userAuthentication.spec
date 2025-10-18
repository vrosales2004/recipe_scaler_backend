<concept_spec>
concept User Authentication

purpose
    To provide secure mechanisms for users to register, log in, and log out of the application, establishing their identity.

principle A user registers with a unique username and password
          the user subsequently logs in with those credentials and they will be recognized as an authenticated user
          this enables them to access personalized features

state
    a set of users
        a username
        a password

    a set of sessions
        a user
        a session id
        an expiration time

actions
    register (username: String, password: String): (user: User)
        requires username must be unique. password must meet complexity requirements
        effect creates a new user with the given details

    login (username: String, password: String): (user: User, sessionId: String)
        requires username and password must be in set of users
        effect creates an active session for the user with the user id and a session id with a set expiration time

    logout (sessionId: String): ()
        requires sessionId must be an active session
        effect deletes the active session
</concept_spec>