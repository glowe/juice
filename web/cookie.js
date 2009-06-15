//
// A simple library for manipulating and accessing session cookies. Does not
// currently support permanent cookies (i.e. cookies with expiration dates).
//

juice.cookie = {

    // Returns the value of cookie if it exists, null otherwise.

    get: function(name) {
        var results = document.cookie.match("(?:^|;) ?" + name + "=([^;]*)(?:;|$)");
        return juice.is_null(results) ? null : unescape(results[1]);
    },

    // Sets the specified session cookie. NOTE: `value` will be converted into
    // a string, e.g. false will become String("false"). Corollary: to set an
    // empty cookie, use an empty string (not null or false or undefined).

    set: function(name, value) {
        document.cookie = name + "=" + escape(value) + "; path=/";
    },

    // Deletes the specified cookie.

    remove: function(name) {
        document.cookie = name + "=; path=/; expires=" + (new Date(0)).toGMTString();
    }
};
