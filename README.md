# Cordova Fencing Agent

## Installation
`cordova plugin add cordova-plugin-fencing-agent`
If after `cordova build`, you end up with an error message complaining about JARs, just `rm -rf platforms` and `cordova platform add` everything back, and everything should work.

## Links
* Github repository: https://github.com/geofrenzy/cordova-plugin-fencing-agent
* Example app source: https://github.com/geofrenzy/Cordova-Blink-1-LED-demo

## What can I do with a Fencing Agent?
Fencing Agents monitor the space around a device to detect requirements and geofences wherein those requirements apply. (Such geofences, paired with their requirements, are called SmartFences™.)

_But can't I already do that with ordinary geofences? Why do I need this?_

The key difference between ordinary geofences and SmartFences is that SmartFences are designed and distributed in a decentralized way that doesn't couple the requirements and SmartFences with any specific app, and makes them discoverable to anyone. The registry that authorizes these entities for publishing is GeoNetwork®, who created this SDK to make it easier to consume the requirements and SmartFences they publish.

_But if I'm only using my own geofences, can't I just add some metadata?_

Not quite. The difference is deeper than that. 
* GeoNetwork's _FDN_ (Fence Delivery Network) has been designed to make SmartFences easy and fast to retrieve and update. What this means is that many devices using Fencing Agents can quickly respond to changes in rules or geometry in real time.
* GeoNetwork hosts a marketplace for SmartFences and requirements, so it's possible to leverage somebody else's SmartFences instead of creating and maintaining large sets of geometries.
* GeoNetwork also produces SDKs for a variety of platforms, so that you don't have to reinvent your geofencing logic on every platform you want your app on.
* GeoNetwork's marketplace also has systems for managing authority over space, so in the event of an unforeseen conflict with another party, you have a platform to resolve it.

## How do I use a Fencing Agent?
The essential workflow of the Fencing Agent is that the Fencing Agent, once started, will autonomously monitor the area, and periodically send its findings to the app developer.

Specifically, it looks like this: (This example should be run after the `deviceready` event has fired.)

``` javascript
/*
    IMPORTANT: If you get an error on these lines, 
    then you need to move this example into a listener for
    "deviceready". 
    With the default setup,
    that should be inside of app.onDeviceReady.
*/

//prototype imports
var FencingAgent = window.plugins.fencingAgent.FencingAgent;
var FencingAgentDelegate = window.plugins.fencingAgent
    .FencingAgentDelegate;
var FencingAgentProfile = window.plugins.fencingAgent
    .FencingAgentProfile;

/*
    This is a configuration object that tells the Fencing Agent 
    which requirements to look for, and the area where 
    it should look.
*/
var profile = new FencingAgentProfile({
        /*
            Should look for the "smartcity.geofrenzy.place."
            GeoDomain.
        */
        "geodomain": "smartcity.geofrenzy.place",
        "range": 20,//Should look for fences within 20 kilometers away
});
/*
    This creates the FencingAgent using that configuration object, 
    but the FA is not running yet.
*/
var fa = new FencingAgent(profile);

/*
    Before we start the FA, we want to register delegates to respond 
    to its messages. These can also be added after the FA has 
    started.
*/
var delegate = new FencingAgentDelegate(
        function(response, agentStatus) {
            alert("FA started!");
        },
        function(response, agentStatus) {
            alert("FA sending an update as it's monitoring");
        },
        function(response, agentStatus) {
            alert("FA experienced an error");
        },
        function(response, agentStatus) {
            alert("FA quit.");
        }
);
fa.addDelegate(delegate);
fa.start();//Should (asynchronously) alert "FA started!"

//---other code---
//Should alert "FA sending an update as it's monitoring" periodically
//--- More other code---

fa.quit();//Should (asynchronously) alert "FA quit."
```
(For more information about the Fencing Agent Profile, see FENCING_AGENT_PROFILE.md on Github.)
Here's what you get for the messages:
* The starting message gives you a validated _AgentState_ object (which contains validated SmartFences and requirements), and an object containing data about the `FencingAgent` itself.
* The periodic message gives you a validated _AgentStateUpdate_ object, which contains a before and after _AgentState_, and another status object of the same type.
* The error message gives you an ordinary Javascript `Error` object. Note that this will stop the agent, and the quit message may not get fired.
* The quit message gives you an _AgentState_ object to capture the final state of the environment, and a final status object about the agent itself.

Now, here's a concrete example of each type (all of which are validated before they get to the delegates; the fields can be trusted not to be wrong or missing):
__AgentState__
``` javascript
{
    "fences": [
        {//This is a SmartFence enriched with state information
            "points": [//long/lat points
                [
                    -115.1526833418757,
                    36.13178759348934
                ],
                [
                    -115.1526887062937,
                    36.13067409677972
                ],
                [
                    -115.1512455940247,
                    36.13068783957008
                ],
                [
                    -115.1512509584427,
                    36.13042787701962
                ],
                [
                    -115.1479518413544,
                    36.13044087516759
                ],
                [
                    -115.1479358319193,
                    36.13143238379754
                ],
                [
                    -115.1487511396408,
                    36.13144098142104
                ],
                [
                    -115.1487511396408,
                    36.13174859970806
                ],
                [
                    -115.1526833418757,
                    36.13178759348934
                ]
            ],
            "ttl": 600,//This is the "time to live"
            /*
                
                This is the status of the agent relative to this 
                fence. In this case, the agent is outside of the
                fence, but has not been outside of it for the
                full duration of the dwell time. Once the dwell
                time elapses, the fence will become `DWELLING`.

                The dwell time also dictates how long it takes
                after a fence is `EXITED` before it becomes 
                `AMBIENT`.
            */
            "status": "ENTERED",
            //this is a Date object, not just a string
            "retrievalTime": "2017-12-19T22:00:56.194Z",
            "anchorpoint": [//This is the centerpoint of the fence
                -115.15015728771687,
                36.13108008351772
            ]
        },
        {//This is another fence
            "points": [
                [
                    -115.1544106006622,
                    36.13363402162857
                ],
                [
                    -115.1544213294983,
                    36.1325725423093
                ],
                [
                    -115.1542980317026,
                    36.132424556871
                ],
                [
                    -115.1538688782603,
                    36.13219926102931
                ],
                [
                    -115.1509881019592,
                    36.13218260752496
                ],
                [
                    -115.1509827375412,
                    36.1336253565494
                ],
                [
                    -115.1544106006622,
                    36.13363402162857
                ]
            ],
            "ttl": 600,
            "status": "EXITED",
            "retrievalTime": "2017-12-19T22:00:56.194Z",
            "anchorpoint": [
                -115.15316161327064,
                36.13277306010207
            ]
        }
    ],
    //This is a GeoDomain object 
    // (window.plugins.fencingAgent.GeoDomain)
    "geodomain": {
        /*
            This can be any of 
            `DWELLING`,
            `EXITED`,
            `ENTERED`,
            or `AMBIENT`.

            `DWELLING` is when an agent has been outside of a 
            fence for a certain time, and `ENTERED` is when 
            that time hasn't passed yet. The other two have the
            same relationship:
            (`DWELLING` is to `AMBIENT` as `EXITED` is to `ENTERED`)
            
            The dwell time can be specified with
            `fencingAgentProfile.dwellTime`. The dwell time
            dictates both how long it takes to go from `ENTERED` to 
            `DWELLING`, and how long it takes to go from `EXITED` to
            `AMBIENT`.
            
            If fencingAgentProfile.insideFocus is set to `false`,
            these values will instead reflect requirement
            applicability. (For example, `DWELLING` would be 
            "requirements have been applicable for [dwellTime]"
            and `ENTERED` would be "requirements appear to be
            applicable, but this won't be confirmed until the
            dwell time passes.")
        */
        "status": "EXITED",
        //This is actually a Date object, not just a string.
        "retrievalTime": "2017-12-19T22:00:56.198Z",
        /*
            Each GeoDomain has a set of requirements of different 
            types (described by `baseType` in each 
            Requirement object.)
        */
        "requirements": [
            /*
                This is a Color Requirement, and it's fairly 
                self-descriptive.
            */
            {
                "baseType": "COLOR",
                "red": 0,
                "blue": 255,
                "green": 97,
                "alpha": 255
            },
            /*
                This is an Interval Requirement, which is basically
                 a number line alternating between "on" and "off".
                 Note that this is not a single span, despite its 
                name. Also, the object 
                (`window.plugins.fencingAgent.IntervalEntitlement`)
                 contains a method, `getStateAtPoint`, 
                which will tell you whether the interval is "on" at
                a given point.
            */
            {
                "baseType": "INTERVAL",
                /*
                    These are all of the places where the number 
                    line switches between its true and false
                    states.
                */
                "stateChangePoints": [
                    0.5,
                    1.5,
                    2,
                    3,
                    3.5,
                    4.5,
                    5,
                    6,
                    6.28
                ],
                /*
                    This determines that any point between `0` 
                    (the `floor`) to 0.5 (the first of the
                     `stateChangePoints`) is true.
                */
                "initialState": true,
                //This is the lowest valid value in the interval.
                "floor": 0,
                //This is the highest valid value in the interval.
                "ceiling": 6.28,
                "unit": "DEGREES_TEMPERATURE"
            },
            /*
                Profile Requirements are arbitrary strings, which 
                may be application specific, or may exist to map
                something more cleanly than the other types do.
            */
            {
                "baseType": "PROFILE",
                "value": "e54e258d-c994-4720-a020-0545a00a0b59"
            },
            /*
                Here's a Boolean Set Requirement. In the future, 
                there'll be names for each Boolean.
            */
            {
                "baseType": "BOOLEANSET",
                "bool0": true,
                "bool1": true,
                "bool2": false,
                "bool3": true,
                "bool4": false,
                "bool5": false,
                "bool6": false,
                "bool7": false,
                "bool8": false,
                "bool9": false,
                "bool10": false,
                "bool11": false,
                "bool12": false,
                "bool13": false,
                "bool14": false,
                "bool15": false
            },
            /*
                A threshold is basically just an interval with only
                 one span.
            */
            {
                "baseType": "THRESHOLD",
                "lowerBound": 16,
                "upperBound": 25,
                "unit": "DEGREES_TEMPERATURE"
            }
        ]
    }
}

```
The dwell concept is shared by Android's [Geofencing Service](https://developer.android.com/training/location/geofencing.html).


__AgentStateUpdate__
``` javascript
{
    "oldState": _AgentState_,
    "newState": _AgentState_
}
```
Agent status update
``` javascript
{
    "isRunning": true,
    "geodomain": "smartcity.geofrenzy.place."
}
```


## What's a GeoDomain?
A GeoDomain is a new form of Internet property which holds your SmartFence assets, including the geometries and requirements that make up your SmartFences. A GeoDomain address is a specific type of domain name. For more information on this and to acquire your GeoDomain address, please discuss with GeoNetwork. 

