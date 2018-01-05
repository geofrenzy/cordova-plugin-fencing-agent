//TODO: make validation sane
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
var requirementTypes = [
    "COLOR",
    "BOOLEANSET",
    "THRESHOLD",
    "INTERVAL",
    "PROFILE"
];

//utils
var requirementFromJSON = function(requirementJSON) {
    switch(requirementJSON.baseType) {
        case "COLOR":
            return new ColorRequirement(requirementJSON);
        case "BOOLEANSET":
            return new BooleanSetRequirement(requirementJSON);
        case "THRESHOLD":
            return new ThresholdRequirement(requirementJSON);
        case "PROFILE":
            return new ProfileRequirement(requirementJSON);
        case "INTERVAL":
            return new IntervalRequirement(requirementJSON);
    }
};
var validateObject = function(obj, contextName) {
    if(typeof obj !== "object") {
        throw new Error(contextName + " recieved a value of type `" + (typeof obj) + "` where it expected an `object`.");
    }

    if(obj === null) {
        throw new Error(contextName + " recieved `null` where it expected a normal object.");
    }
    return obj;
};

var validateNumber = function(num, contextName) {
    if(isNaN(num)) {
        throw new Error(
                contextName + " recieved a value of type `" + (typeof num) + "` where it expected a `number`.\n" + 
                "Recieved value was: `" + JSON.stringify(num) + "`"
                );
    }
    return num;
};

//Exports
function Requirement(baseType) {
    if(!(requirementTypes.indexOf(baseType) > -1)) {
        throw new Error("Invalid requirement type recieved. (`" + baseType + "`)");
    }
    this.baseType = baseType;
}

function ThresholdRequirement(thresholdJSON) {
    validateObject(thresholdJSON);
    Requirement.bind(this)("THRESHOLD");
    this.lowerBound = validateNumber(thresholdJSON.lowerBound, "ThresholdRequirement.prototype.lowerBound");
    this.upperBound = validateNumber(thresholdJSON.upperBound, "ThresholdRequirement.prototype.upperBound");
    this.unit = thresholdJSON.unit, "ThresholdRequirement.prototype.lowerBound";
}

function ColorRequirement(colorJSON) {
    validateObject(colorJSON);
    Requirement.bind(this)("COLOR");

    var validateColor = function(color) {
        if(!(!isNaN(color) && color % 1 === 0)) {
            throw new Error("ColorRequirement recieved a color that was not a whole number. (Recieved value: `" + color + "`)");
        }
        if(color < 0 || color > 255) {
            throw new Error("ColorRequirement recieved color outside of range [0,255].");
        }
        return color;
    }

    this.red = validateColor(colorJSON.red);
    this.blue = validateColor(colorJSON.blue);
    this.green = validateColor(colorJSON.green);
    this.alpha = validateColor(colorJSON.alpha);
}

function BooleanSetRequirement(boolsetJSON) {
    validateObject(boolsetJSON);
    Requirement.bind(this)("BOOLEANSET");

    var validateBool = function(bool) {
        if(typeof bool === "undefined") {
            return undefined;
        }
        if(!(typeof bool === "boolean")) {
            throw new Error("BooleanRequirement recieved a non-boolean value.");
        }
        return bool;
    }

    this.bool0 = validateBool(boolsetJSON["bool0"]);
    this.bool1 = validateBool(boolsetJSON["bool1"]);
    this.bool2 = validateBool(boolsetJSON["bool2"]);
    this.bool3 = validateBool(boolsetJSON["bool3"]);
    this.bool4 = validateBool(boolsetJSON["bool4"]);
    this.bool5 = validateBool(boolsetJSON["bool5"]);
    this.bool6 = validateBool(boolsetJSON["bool6"]);
    this.bool7 = validateBool(boolsetJSON["bool7"]);
    this.bool8 = validateBool(boolsetJSON["bool8"]);
    this.bool9 = validateBool(boolsetJSON["bool9"]);
    this.bool10 = validateBool(boolsetJSON["bool10"]);
    this.bool11 = validateBool(boolsetJSON["bool11"]);
    this.bool12 = validateBool(boolsetJSON["bool12"]);
    this.bool13 = validateBool(boolsetJSON["bool13"]);
    this.bool14 = validateBool(boolsetJSON["bool14"]);
    this.bool15 = validateBool(boolsetJSON["bool15"]);
}

function ProfileRequirement(profileJSON) {
    validateObject(profileJSON);
    Requirement.bind(this)("PROFILE");
    if(!(typeof profileJSON.value === 'string' || profileJSON.value instanceof String)) {
        throw new Error(
                "ProfileRequirement constructor recieved a value that was not a string.\n" +
                "\n Recieved value: `" + profileJSON.value + "`"
                );
    }
    this.value = profileJSON.value;
}

function IntervalRequirement(intervalJSON) {
    validateObject(intervalJSON);
    Requirement.bind(this)("INTERVAL");

    if(!Array.isArray(intervalJSON.stateChanges)) {
        throw new Error("IntervalRequirement recieved an invalid array for stateChangePoints.");
    }
    for(var i = 0; i < intervalJSON.stateChanges.length; i++) {
        validateNumber(intervalJSON.stateChanges[i], "intervalJSON.stateChanges");
    }

    if(typeof intervalJSON.initialState !== "boolean") {
        throw new Error("IntervalRequirement recieved a non-boolean value for initialState.");
    }

    this.stateChangePoints = intervalJSON.stateChanges;
    this.initialState = intervalJSON.initialState;
    this.floor = validateNumber(intervalJSON.floor, "IntervalRequirement.prototype.floor");
    this.ceiling = validateNumber(intervalJSON.ceiling, "IntervalRequirement.prototype.ceiling");
    this.unit = intervalJSON.unit;//TODO validate

    this.getStateAtPoint = function(point) {
        validateNumber(point, "IntervalRequirement.prototype.getStateAtPoint");
        if(point < floor || point > ceiling) {
            throw new Error("IntervalRequirement.prototype.getStateAtPoint recieved a point that was not between its floor and ceiling.");
        }
        var currentState = this.initialState;
        for(var i = 0; i < stateChangePoints.length; i++) {
            currentState = !currentState;
            if(point >= stateChangePoints[i]) {
                break;
            }
        }
        return currentState;
    }.bind(this);
}

function FencingAgentProfile(config, lenient) {
    validateObject(config);
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
        if(!(!isNaN(config.range))) {
            throw new Error("`range` in `FencingAgentProfile` must be numeric.");
        }
    } else {
        config.range = 2;//2 kilometers
    }

    if(typeof config.zoomLevel !== "undefined" && config.zoomLevel !== null) {
        if(!(!isNaN(config.zoomLevel))) {
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
                this.onStarted(new FencingAgentState(messageContent), agentStatus);
                break;
            case "onQuit":
                this.onQuit(new FencingAgentState(messageContent), agentStatus);
                break;
            case "fencesRefreshed":
                this.fencesRefreshed(new FencingAgentStateUpdate(messageContent), agentStatus);
                break;
            case "onException":
                //TODO?
                this.onError(messageContent, agentStatus);
                break;
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

    //validation
    if(!(agentProfile instanceof FencingAgentProfile)) {
        if(typeof agentProfile === "undefined") {
            throw new Error("FencingAgent configured with an invalid FencingAgentProfile.");
        }
    }

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

    //TODO: use entity types
    //TODO: agentStatus?
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

//TODO: add geodomain
function FencingAgentState(stateJSON) {
    validateObject(stateJSON);
    //public properties
    this.fences = [];
    this.geodomain;

    //init
    //this.fences
    if(!Array.isArray(stateJSON.fences)) {
        throw new Error(
                "FencingAgentState constructor recieved a list of fences that wasn't an array." + 
                "\nRecieved value was `" + stateJSON.fences + "`"
        );
    }
    for(var i = 0; i < stateJSON.fences.length; i++) {
        (function(i) {
            console.log("JSMARK " + JSON.stringify(stateJSON.fences[i]));
            this.fences.push(new SmartFence(stateJSON.fences[i]));
        }).bind(this)(i);
    }
    
    //this.geodomain
    this.geodomain = new Geodomain(stateJSON.geodomain);
}

function FencingAgentStateUpdate(updateJSON) {
    this.oldState = new FencingAgentState(updateJSON.oldSnapshot);
    this.newState = new FencingAgentState(updateJSON.newSnapshot);
}

function Geodomain(geodomainJSON) {
    validateObject(geodomainJSON);
    //public properties
    this.status = undefined;
    this.retrievalTime = undefined;
    this.requirements = undefined;

    //private properties
    var geodomainStatuses = [
        "AMBIENT",
        "DWELLING",
        "EXITED",
        "ENTERED"
    ];

    //init
    //this.requirements
    console.log("JSMARK4" +  JSON.stringify(geodomainJSON.geodomain.requirements));
    this.requirements = geodomainJSON.geodomain.requirements.map(requirementFromJSON);

    //this.status
    if(!(geodomainStatuses.indexOf(geodomainJSON.status.status) > -1)) {
        throw new Error(
                "Geodomain constructor recieved with invalid status." +
                "\nRecieved value was `" + geodomainJSON.status.status + "`"
        );
    }
    this.status = geodomainJSON.status.status;

    //this.retrievalTime
    if(isNaN(Date.parse(geodomainJSON.status.retrievalTime))) {
        throw new Error(
                "Geodomain constructor recieved an invalid date." + 
                "\nRecieved value was `" + geodomainJSON.status.retrievalTime + "`"
        );
    }
    this.retrievalTime = new Date(geodomainJSON.status.retrievalTime);
}

function SmartFence(fenceJSON) {
    validateObject(fenceJSON);
    //public properties
    this.anchorPoint = undefined;
    this.points = [];
    this.ttl = undefined;
    this.status = undefined;
    this.retrievalTime = undefined;

    //private properties
    var validStatuses = [
        "DWELLING",
        "AMBIENT",
        "EXITED",
        "ENTERED"
    ];

    //private methods
    var validatePoint = function(point) {
        if(!(Array.isArray(point) && point.length === 2)) {
            throw new Error(
                    "SmartFence constructor recieved a point that wasn't a 2 element array." +
                    "\nRecieved value was: `" + point + "`"
            );
        }
        if(isNaN(point[0])) {
            throw new Error(
                    "SmartFence constructor recieved a point whose longitude wasn't a number." + 
                    "\nRecieved value was `" + point[0] + "`"
            );
        }
        if(isNaN(point[1])) {
            throw new Error(
                    "SmartFence constructor recieved a point whose latitude wasn't a number." +
                    "\nRecieved value was `" + point[1] + "`"
            );
        }
        if(Math.abs(point[0]) > 180) {
            throw new Error(
                    "SmartFence constructor recieved a point whose longitude is outside of the range [-180,180]." +
                    "\nRecieved value was `" + point[0] + "`"
            );
        }
        if(Math.abs(point[1] > 90)) {
            throw new Error(
                    "Fence Anchorpoint recieved with latitude outside of the range [-90,90]." + 
                    "\nRecieved value was `" + point[1] + "`"
            );
        }
        return point;
    };

    //init
    //this.anchorpoint
    this.anchorpoint = validatePoint(fenceJSON.fence.anchorpoint);

    //this.points
    if(!Array.isArray(fenceJSON.fence.points)) {
        throw new Error(
                "SmartFence constructor recieved a list that wasn't an array where it expected to find its point list." + 
                "\nRecieved value was `" + fenceJSON.fence.points + "`"
        );
    }
    for(var i = 0; i < fenceJSON.fence.points.length; i++) {
        (function(i) {
            this.points.push(validatePoint(fenceJSON.fence.points[i]));
        }).bind(this)(i);
    }

    //this.ttl
    if(!(!isNaN(fenceJSON.fence.ttl) && fenceJSON.fence.ttl % 1 === 0 && fenceJSON.fence.ttl >= 0)) {
        throw new Error(
                "SmartFence constructor recieved a TTL value that was not a non-negative whole number." + 
                "\nRecieved value was `" + fenceJSON.fence.ttl + "`"
        );
    }
    this.ttl = fenceJSON.fence.ttl;

    //this.retrievalTime
    if(isNaN(Date.parse(fenceJSON.meta.retrievalTime))) {
        throw new Error(
                "SmartFence constructor recieved an invalid date." + 
                "\nRecieved value was `" + fenceJSON.meta.retrievalTime + "`"
        );
    }
    this.retrievalTime = new Date(fenceJSON.meta.retrievalTime);

    //status
    if(!(validStatuses.indexOf(fenceJSON.meta.status) > (-1))) {
        throw new Error(
                "SmartFence constructor recieved with invalid status." +
                "\nRecieved value was `" + fenceJSON.meta.status + "`"
        );
    }
    this.status = fenceJSON.meta.status;
}

module.exports = {
    "FencingAgentProfile": FencingAgentProfile,
    "FencingAgentDelegate": FencingAgentDelegate,
    "FencingAgent": FencingAgent,
    "SmartFence": SmartFence,
    "Geodomain": Geodomain,
    "Requirement": Requirement,
    "ColorRequirement": ColorRequirement,
    "BooleanSetRequirement": BooleanSetRequirement,
    "ThresholdRequirement": ThresholdRequirement,
    "IntervalRequirement": IntervalRequirement,
    "ProfileRequirement": ProfileRequirement,
    "FencingAgentState": FencingAgentState,
    "FencingAgentStateUpdate": FencingAgentStateUpdate
};
