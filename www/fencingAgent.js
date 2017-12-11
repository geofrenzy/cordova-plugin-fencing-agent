var actions = {
    "WATCH_FOR_NEXT_EVENT": "nextEvent",
    "QUIT": "quit",
    "START": "start",
    "PURGE_CACHE": "purgeCache",
    "CREATE_AGENT": "createAgent"
};
var delegateMessageTypes = {
    "ON_START": "onStart",
    "ON_QUIT": "onQuit",
    "ON_FENCE_REFRESH": "fencesRefreshed",
    "ON_EXCEPTION": "onException"
};


//Exports
function FencingAgentProfile(config, lenient) {
    //Validation
    //If not in lenient mode, the config object must not contain any keys outside of those that are used.
    var keyNames = ["geodomain", "detectApproach", "zoomLevel", "range", "interiorFocus"];
    if(lenient !== true) {
        var configKeyNames = Object.getOwnPropertyNames(config);
        for(var i = 0; i < configKeyNames.length; i++) {
            (function(i) {
                var name = configKeyNames[i];
                if(keyNames.indexOf(name) === -1) {
                    throw new Error("`FencingAgentProfile` instantiated with an object containing other keys without `lenient` set to true.");
                }
            })(i);
        }
    }

    //Geodomain is not optional
    if(typeof config.geodomain === "undefined") {
        throw new Error("`FencingAgentProfile` instantiated without a Geodomain. Set `geodomain` on the object given as the first parameter to `FencingAgentProfile`.");
    }
    //Each option, if specified, must be of the right type, and within the right bounds.
    if(!(typeof config.geodomain === "string" || config.geodomain instanceof String)) {
        throw new Error("`geodomain` in `FencingAgentProfile` must be a string.");
    }

    if(typeof config.range !== "undefined" && config.zoomLevel !== null) {
        if(!(typeof config.range === "number")) {
            throw new Error("`range` in `FencingAgentProfile` must be numeric.");
        }
    } else {
        config.range = 2;//2 kilometers
    }

    if(typeof config.zoomLevel !== "undefined" && config.zoomLevel !== null) {
        if(!(typeof config.zoomLevel === "number")) {
            throw new Error("`zoomLevel` in `FencingAgentProfile` must be numeric.");
        }
        if(!(config.zoomLevel % 1 === 0 && config.zoomLevel > 0 && config.zoomLevel < 32)) {
            throw new Error("`zoomLevel` in `FencingAgentProfile` must be a whole number between 0 and 32.");
        }
    } else {
        config.zoomLevel = 16;//TODO: de-magicnumber this
    }

    if(typeof config.detectApproach !== "undefined" && config.detectApproach !== null) {
        if(!(typeof config.detectApproach === "boolean")) {
            throw new Error("`detectApproach` in `FencingAgentProfile` must be a boolean value.");
        }
    } else {
        config.detectApproach = false;
    }

    if(typeof config.interiorFocus !== "undefined" && config.interiorFocus !== null) {
        if(!(typeof config.interiorFocus === "boolean")) {
            throw new Error("`interiorFocus` in `FencingAgentProfile` must be a boolean value.");
        }
    } else {
        config.interiorFocus = true;
    }

    //NOTE: these do not change any agents that already recieved this object.
    this.geodomain = config.geodomain;
    this.range = config.range;
    this.zoomLevel = config.zoomLevel;
    this.detectApproach = config.detectApproach;
    this.interiorFocus = config.interiorFocus;

    //This is encapsulated in order to handle deeper nesting in the future.
    this.copy = function() {
        return new FencingAgentProfile({
            "geodomain": this.geodomain,
            "zoomLevel": this.zoomLevel,
            "range": this.range,
            "detectApproach": this.detectApproach,
            "interiorFocus": this.interiorFocus
        });
    }
}

function FencingAgentDelegate(onStarted, fencesRefreshed, onError, onQuit) {
    //Validation
    var checkFunction = function(arg, argName) {
        if(!(typeof arg === "function" || typeof arg === "undefined")) {
            throw new Error("`FencingAgentDelegate` was constructed with an invalid value for `" + argName + "`. Must either be a `function`, or `undefined`.");
        }
    }
    checkFunction(onStarted, "onStarted");
    checkFunction(fencesRefreshed, "fencesRefreshed");
    checkFunction(onError, "onError");
    checkFunction(onQuit, "onQuit");

    this.onStarted = onStarted;
    this.onQuit = onQuit;
    this.fencesRefreshed = fencesRefreshed;
    this.onError = onError;

    this.handleMessage = function(message) {
        var messageIdentifier = message.message.type;
        var messageContent = message.message.content;
        var agentStatus = message.status;
        switch(messageIdentifier) {
            case "onStart":
                this.onStarted(messageContent, agentStatus);
                break;
            case "onQuit":
                this.onQuit(messageContent, agentStatus);
                break;
            case "fencesRefreshed":
                this.fencesRefreshed(messageContent, agentStatus);
                break;
            case "onException":
                this.onError(messageContent, agentStatus);
            default:
                throw new Error("`FencingAgentDelegate` object recieved unrecognized message type: `" + messageIdentifier + "`");
        }
    }
}

function FencingAgent(agentProfile) {
    //Public instance methods
    this.start = startImpl;
    this.addDelegate = addDelegateImpl;
    this.quit = quitImpl;
    this.purgeCache = purgeCacheImpl;

    //Private members
    var profile = agentProfile.copy();
    var delegates = [];

    //Util functions
    var cordovaErrorHandler = function(cordovaError) {
        throw cordovaError;
    };

    var simpleAgentCall = function(actionName) {
            cordova.exec(
                function(response) {},
                cordovaErrorHandler,
                "FencingAgent",
                actions[actionName],
                [profile.geodomain]
            );
    }
    var agentCallWithResult = function(actionName, callback) {
            cordova.exec(
                function(response) {
                    callback(response.content);
                },
                cordovaErrorHandler,
                "FencingAgent",
                actions[actionName],
                [profile.geodomain]
            );
    }

    var sendResponseToDelegates = function(response) {
        for(var i = 0; i < delegates.length; i++) {
            delegates[i].handleMessage(response);
        }
        watchForNextAgentEvent();
    }

    var watchForNextAgentEvent = function() {
        console.log("MARK " + "watching for next event");
        cordova.exec(
                function(response) {
                    sendResponseToDelegates(response);
                },
                function(error) {
                    sendResponseToDelegates(error);
                },
                "FencingAgent",
                actions.WATCH_FOR_NEXT_EVENT,
                [profile.geodomain]
        );
    }

    //Initialization
    //TODO: Is this a race condition with the first method call on the newly created FencingAgent?
    cordova.exec(
        function(response) {
            console.log("MARK init returned with success");
            watchForNextAgentEvent();
        },
        cordovaErrorHandler,
        "FencingAgent",
        actions.CREATE_AGENT,
        [profile.geodomain, profile.range, profile.zoomLevel, profile.detectApproach, profile.interiorFocus]
    );


    //Implementations of public instance methods
    function startImpl() {
        simpleAgentCall("START");
    }

    function quitImpl() {
        simpleAgentCall("QUIT");
    }

    function purgeCacheImpl() {
        simpleAgentCall("PURGE_CACHE");
    }

    function addDelegateImpl(delegate) {
        console.log("MARK adding delegate");
        //Validation
        if(!(delegate instanceof FencingAgentDelegate)) {
            throw new Error("A FencingAgent recieved a delegate object that wasn't really a `FencingAgentDelegate`.");
        }

        delegates.push(delegate);
    }
}


module.exports = {
    "FencingAgentProfile": FencingAgentProfile,
    "FencingAgentDelegate": FencingAgentDelegate,
    "FencingAgent": FencingAgent
};
