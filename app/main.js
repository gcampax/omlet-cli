// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of DataShare
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Q = require('q');
const readline = require('readline');

const OmletFactory = require('./omlet');
// GIANT HACK
const LDProto = require('omlib/lib/longdan/ldproto');

const Messaging = require('./messaging');
const FeedUtils = require('./feeds');

function readOneLine(rl) {
    return Q.Promise(function(callback, errback) {
        rl.once('line', function(line) {
            if (line.trim().length === 0) {
                errback(new Error('User cancelled'));
                return;
            }

            callback(line);
        })
    });
}

function quit() {
    console.log('Bye\n');
    rl.close();
    process.exit();
}

function help() {
    // FINISHME
}

function listFeeds() {
    return FeedUtils.getFeedList(messaging).then((feeds) => {
        feeds.forEach(function(f) {
            console.log('> ' + f.identifier + ' ' + f.name);
        }, this);
    });
}

function onIncomingMessage(msg) {
    console.log('onIncomingMessage');
    if (msg.hidden)
        return;

    if (msg.type === 'text')
        console.log(String(msg.text));
}

function switchFeed(identifier) {
    if (!identifier)
        return;

    if (_currentFeed) {
        _currentFeed.removeListener('incoming-message', onIncomingMessage);
        _currentFeed.close();
    }

    var feed = messaging.getFeed(identifier);
    _currentFeed = feed;
    feed.on('incoming-message', onIncomingMessage);
    return feed.open();
}

var rl, messaging, platform;
var _currentFeed = null;

function main() {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.setPrompt('$ ');

    platform = require('./platform');
    platform.init();

    var client = OmletFactory(platform, true);
    messaging = new Messaging(client);

    Q.try(function() {
        if (!client.auth.isAuthenticated()) {
            console.log('Omlet login required');
            console.log('Insert phone number:');
            rl.prompt();

            var phone;
            return readOneLine(rl).then(function(line) {
                phone = line.trim();
                client._ldClient.auth.connectPhone(phone);
                console.log('Insert confirm code:');
                return readOneLine(rl);
            }).then(function(code) {
                var identity = new LDProto.LDIdentity();
                identity.Type = LDProto.LDIdentityType.Phone;
                identity.Principal = phone;

                return Q.Promise(function(callback) {
                    client._ldClient.onSignedUp = callback;
                    client._ldClient.auth.confirmPinForIdentity(identity, code.trim(),
                                                                client._ldClient.auth._onAuthenticationComplete.bind(client._ldClient.auth));
                });
            });
        }
    }).delay(1000).then(function() {
        return messaging.start();
    }).then(() => {
        rl.on('line', function(line) {
            Q.try(function() {
                if (line[0] === '\\') {
                    if (line[1] === 'h' || line[1] === '?')
                        return help();
                    else if (line[1] === 'q')
                        return quit();
                    else if (line[1] === 'l')
                        return listFeeds()
                    else if (line[1] === 's')
                        return switchFeed(line.substr(2).trim());
                } else if (line.trim()) {
                    if (_currentFeed)
                        return _currentFeed.sendText(line.trim());
                    else
                        console.log('No feed selected, use \\l and \\s');
                }
            }).finally(() => {
                rl.prompt();
            }).done();
        });
        rl.on('SIGINT', quit);

        rl.prompt();
    }).done();
}

main();
