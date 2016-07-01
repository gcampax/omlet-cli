// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Q = require('q');

function getFeedName(messaging, f) {
    if (f.name)
        return f;

    f = JSON.parse(JSON.stringify(f));
    if (f.members.length === 1) {
        f.name = "You";
        return f;
    }
    if (f.members.length === 2) {
        if (f.members[0] === 1) {
            return engine.messaging.getUserById(f.members[1]).then(function(u) {
                f.name = u.name;
                return f;
            });
        } else {
            return engine.messaging.getUserById(f.members[0]).then(function(u) {
                f.name = u.name;
                return f;
            });
        }
    } else {
        f.name = "Unnamed (multiple partecipants)";
    }
    return f;
}

module.exports = {
    getFeedName: getFeedName,

    getFeedList: function(messaging) {
        return messaging.getFeedMetas().then(function(feeds) {
            return feeds.filter(function(f) {
                // HACK: omlet sometime will forget the hasWriteAccess field
                // treat undefined same as true in that case
                return f.hasWriteAccess !== false && f.kind === null;
            });
        }).then(function(feeds) {
            return Q.all(feeds.map(function(f) {
                return getFeedName(messaging, f);
            }));
        });
    },
};
