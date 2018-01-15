package net.geofrenzy.android.cordova;

import java.util.ArrayList;
import java.util.HashMap; 
import java.util.LinkedList;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.LOG;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaArgs;

import android.content.Context;
import android.util.Log;

import net.geofrenzy.android.sdk.agent.FencingAgent;
import net.geofrenzy.android.sdk.agent.profile.FencingAgentProfile;
import net.geofrenzy.android.sdk.agent.delegate.FencingAgentDelegate;
import net.geofrenzy.android.sdk.domain.agentstate.AgentState;
import net.geofrenzy.android.sdk.domain.agentstate.AgentStateUpdate;
import net.geofrenzy.android.sdk.domain.agentstate.ApproachDetails;
import net.geofrenzy.android.sdk.domain.agentstate.WatchedFence;
import net.geofrenzy.android.sdk.domain.fences.Point;
import net.geofrenzy.android.sdk.domain.requirements.domain.RequirementBaseType;
import net.geofrenzy.android.sdk.domain.requirements.BooleanSetRequirement;
import net.geofrenzy.android.sdk.domain.requirements.ColorRequirement;
import net.geofrenzy.android.sdk.domain.requirements.ProfileRequirement;
import net.geofrenzy.android.sdk.domain.requirements.ThresholdRequirement;
import net.geofrenzy.android.sdk.domain.requirements.IntervalRequirement;
import net.geofrenzy.android.sdk.exception.BlobRequirementsUnsupportedException;
import net.geofrenzy.android.sdk.domain.agentstate.WatchedGeodomain;
import net.geofrenzy.android.sdk.domain.geodomains.Geodomain;
import net.geofrenzy.android.sdk.domain.requirements.Requirement;

public class FencingAgentPlugin extends CordovaPlugin {
    private static final String LOG_TAG = "FencingAgentPlugin";

    //[profile.geodomain, profile.range, profile.zoomLevel, profile.detectApproach, profile.interiorFocus, profile.dwellTime]
    private static final int GEODOMAIN_ARGUMENT_POSITION = 0;
    private static final int RANGE_ARGUMENT_POSITION = 1;
    private static final int ZOOMLEVEL_ARGUMENT_POSITION = 2;
    private static final int DETECT_APPROACH_ARGUMENT_POSITION = 3;
    private static final int INTERIOR_FOCUS_ARGUMENT_POSITION = 4;
    private static final int DWELL_TIME_ARGUMENT_POSITION = 5;

    private HashMap<String, FencingAgent<Void>> agents = new HashMap<String, FencingAgent<Void>>();
    private HashMap<String, CordovaDelegate> delegates = new HashMap<String, CordovaDelegate>();

    public boolean execute(String action, CordovaArgs args, CallbackContext callbackContext) throws JSONException {
        try {
            String geodomain = args.optString(GEODOMAIN_ARGUMENT_POSITION);
            if(geodomain == null) {
                throw new IllegalArgumentException("`null` Geodomain recieved by FencingAgent Cordova plugin.");
            }
            PluginAction actionType = PluginAction.fromName(action);

            FencingAgent<Void> fa = agents.get(geodomain);
            CordovaDelegate delegate = delegates.get(geodomain);
            if(fa == null && actionType != PluginAction.CREATE_AGENT) {
                throw new IllegalStateException("Cordova Fencing Agent attempted to act on a non-existent agent." + 
                        " This state should be unreachable; please file a bug report with Geofrenzy."
                        );
            }
            if(delegate == null && actionType != PluginAction.CREATE_AGENT) {
                throw new IllegalStateException("Cordova Fencing Agent discovered a missing delegate for agent `" + 
                        geodomain + "`This state should be unreachable; please file a bug report with Geofrenzy."
                        );
            }

            JSONObject responseJSON = new JSONObject();
            System.out.println("MARK Recieved an action from JS: " + action);
            switch(actionType) {
                case CREATE_AGENT:
                    if(fa != null) {
                        throw new IllegalStateException(
                                "Geofrenzy Cordova SDK attempted to create a FencingAgent that already existed." +
                                "This state should be unreachable; please file a bug report with Geofrenzy."
                        );
                    }
                    int zoomLevel = args.getInt(ZOOMLEVEL_ARGUMENT_POSITION);
                    int range = args.getInt(RANGE_ARGUMENT_POSITION);
                    boolean detectApproach = args.getBoolean(DETECT_APPROACH_ARGUMENT_POSITION);
                    boolean interiorFocus = args.getBoolean(INTERIOR_FOCUS_ARGUMENT_POSITION);
                    long dwellTime = (long) 1000 * args.getInt(DWELL_TIME_ARGUMENT_POSITION);

                    fa = new FencingAgent<Void>(
                            new FencingAgentProfile.Builder()
                            .setGeodomain(geodomain)
                            .setRange(range)
                            .setZoomLevel(zoomLevel)
                            .setEmitApproachEvents(detectApproach)
                            .setInsideFocus(interiorFocus)
                            .setDwellTime(dwellTime)
                            .setContext(this.cordova.getActivity().getApplicationContext())
                            .createAgentProfile(),
                            Void.class
                            );
                    delegate = new CordovaDelegate(fa);

                    agents.put(geodomain, fa);
                    delegates.put(geodomain, delegate);

                    callbackContext.success(responseJSON);
                    return true;
                case START:
                    fa.addDelegate(delegate);
                    fa.start();
                    callbackContext.success(responseJSON);
                    return true;
                case QUIT:
                    fa.quit();
                    callbackContext.success(responseJSON);
                    return true;
                case PURGE_CACHE:
                    fa.purgeCache();
                    callbackContext.success(responseJSON);
                    return true;
                case WATCH_FOR_NEXT_EVENT:
                    System.out.println("MARK watchfornextevent recieved from JS");
                    if(callbackContext == null) {
                        throw new IllegalStateException("Fencing Agent plugin for Cordova recieved a null CallbackContext from Javascript.");
                    }
                    delegate.notifyJavascript(callbackContext);
                    return true;
                default:
                    throw new IllegalStateException("You have found a bug in the Fencing Agent plugin for Cordova. Please report it to Geofrenzy with a stacktrace.");
            }
        } catch(Throwable throwable) {
            logError(throwable);
            callbackContext.error(throwable.getMessage());
            return true;
        }
    }

    private enum PluginAction {
        QUIT("quit"),
        START("start"),
        PURGE_CACHE("purgeCache"),
        CREATE_AGENT("createAgent"),
        WATCH_FOR_NEXT_EVENT("nextEvent");

        private final String actionName;

        PluginAction(String actionName) {
            this.actionName = actionName;
        }

        public String getActionName() {
            return this.actionName;
        }

        public static PluginAction fromName(String actionName) {
            if(actionName == null) {
                throw new IllegalArgumentException("FencingAgent plugin for Cordova given `null` for an action.");
            }
            for(PluginAction action : PluginAction.values()) {
                if(actionName.equals(action.getActionName())) {
                    return action;
                }
            }
            throw new IllegalArgumentException(String.format(
                    "FencingAgent plugin for Cordova recieved unrecognized action type `%s`",
                    actionName
            ));
        }
    }

    private enum DelegateMessageType {
        ON_START("onStart"),
        ON_QUIT("onQuit"),
        ON_FENCE_REFRESH("fencesRefreshed"),
        ON_EXCEPTION("onException");

        private final String actionName;

        DelegateMessageType(String actionName) {
            this.actionName = actionName;
        }

        public String getActionName() {
            return this.actionName;
        }

        public static DelegateMessageType fromName(String actionName) {
            if(actionName == null) {
                throw new IllegalArgumentException("Internal exception in Fencing Agent Plugin for Cordova; please file a bug report with Geofrenzy.");
            }
            for(DelegateMessageType action : DelegateMessageType.values()) {
                if(actionName.equals(action.getActionName())) {
                    return action;
                }
            }
            throw new IllegalArgumentException(String.format(
                    "Fencing Agent plugin for Cordova found unrecognized delegate message type `%s`." + 
                    "This should be impossible; please file a bug report with Geofrenzy.",
                    actionName
            ));
        }
    }

    /**
     * This delegate is meant to keep the Javascript informed.
     *
     * It's not possible to call JS from Java, so the closest we can get is to have a javascript function that:
     * <ol>
     *     <li>Requests an update about an agent from the Java delegate</li>
     *     <li>Waits to recieve any of the four delegate messages<li>
     *     <li>Calls the corresponding callback in the Javascript delegates</li>
     *     <li>Sends the same request again.</li>
     * </ol>
     */
    private class CordovaDelegate implements FencingAgentDelegate<Void> {
        private LinkedList<JSONObject> responseQueue = new LinkedList<JSONObject>();
        private boolean waitingForNotification = false;
        private CallbackContext waitingJavascript = null;
        private FencingAgent<Void> fa;

        public CordovaDelegate(FencingAgent<Void> fa) {
            this.fa = fa;
        }

        public void handleException(RuntimeException exception, AgentState<Void> stateBeforeException) {
            try {
                JSONObject messageContent = new JSONObject();
                messageContent.put("message", exception.getMessage());
                messageContent.put("stateBeforeError", serializeAgentState(stateBeforeException));
                handleResponse(createResponse(DelegateMessageType.ON_EXCEPTION, messageContent), false);
            } catch(JSONException jsone) {
                logError(jsone);
                //throw new RuntimeException(jsone);
            }
        }

        public void fencesRefreshed(AgentStateUpdate<Void> agentStateUpdate) {
            try {
                handleResponse(createResponse(DelegateMessageType.ON_FENCE_REFRESH, serializeAgentStateUpdate(agentStateUpdate)), true);
            } catch(JSONException jsone) {
                logError(jsone);
                //throw new RuntimeException(jsone);
            }
        }

        public void onStarted(AgentState<Void> initialState) {
            try {
                handleResponse(createResponse(DelegateMessageType.ON_START, serializeAgentState(initialState)), true);
            } catch(JSONException jsone) {
                logError(jsone);
                //throw new RuntimeException(jsone);
            }
        }

        public void onQuit(AgentState<Void> finalState) {
            try {
                handleResponse(createResponse(DelegateMessageType.ON_QUIT, serializeAgentState(finalState)), true);
            } catch(JSONException jsone) {
                logError(jsone);
                //throw new RuntimeException(jsone);
            }
        }

        /**
         * This method is responsible for answering requests for information from Javascript.
         *
         * It has two behaviors:
         * <ol>
         *     <li>If it already has a few messages that it hasn't communicated yet, it 
         *     gives the oldest message to Javascript immediately.</li>
         *     <li>If it doesn't have any messages, it flips a flag inside of the delegate that
         *     makes it so that the next message from the FA will be relayed immediately.</li>
         * </ol>
         */
        public void notifyJavascript(CallbackContext callbackContext) {
            System.out.println("MARK notifying callbackContext.");
            if(responseQueue.size() > 0) {
                System.out.println("MARK sending success message to javascript.");
                callbackContext.success(responseQueue.pop());
            } else {
                if(getNotificationState() == false) {
                    System.out.println("MARK waiting for next delegate update from Java");
                    waitingForNotification = true;
                    waitingJavascript = callbackContext;
                } else {
                    throw new IllegalStateException("A CordovaDelegate was given a Javascript callback when it already had one. " + 
                            "This is a bug in the Fencing Agent Cordova plugin; please report it to Geofrenzy."
                    );
                }
            }
        }

        /**
         * This method handles the plumbing details of getting a JSON object to Javascript,
         * so that the delegate methods can stay focused on their JSON.
         */
        private void handleResponse(JSONObject response, boolean successful) {
            System.out.println("MARK fencing agent sent message to CordovaDelegate");
            if(getNotificationState()) {
            System.out.println("CordovaDelegate has waiting JS callback; calling it");
                if(successful) {
                    waitingJavascript.success(response);
                } else {
                    waitingJavascript.error(response);
                }
                waitingJavascript = null;
                waitingForNotification = false;
            } else {
            System.out.println("CordovaDelegate has no JS waiting; adding response to queue");
                responseQueue.add(response);
            }
        }

        private boolean getNotificationState() {
            if(waitingForNotification == (waitingJavascript == null)) {
                throw new IllegalStateException(
                        "CordovaDelegate's waiting status is inconsistent with its own Javascript tracking." + 
                        "Please file a bug report with Geofrenzy. This should never happen."
                );
            }
            return waitingForNotification;
        }

        private JSONObject createResponse(DelegateMessageType messageType, JSONObject content) throws JSONException {
            JSONObject response = new JSONObject();

            JSONObject responseMessage = new JSONObject();
            responseMessage.put("type", messageType.getActionName());
            responseMessage.put("content", content);

            response.put("status", serializeAgentStatus(this.fa));
            response.put("message", responseMessage);
            return response;
        }
    }

    private static JSONObject serializeAgentState(AgentState<Void> agentState) throws JSONException {
        JSONObject serializedState = new JSONObject();
        if(agentState == null) {
            return serializedState;
        }

        ArrayList<JSONObject> fenceList = new ArrayList<JSONObject>();
        for(WatchedFence fence : agentState.getFences()) {
            JSONObject serializedFence = new JSONObject();
            JSONObject fenceDetails = new JSONObject();
            JSONObject fenceMetadata = new JSONObject();

            ArrayList<JSONArray> pointList = new ArrayList<JSONArray>();
            for(Point point : fence.getFence().getPoints()) {
                pointList.add(serializePoint(point));
            }
            JSONArray serializedPoints = new JSONArray(pointList);
            fenceDetails.put("anchorpoint", serializePoint(fence.getFence().getAnchorPoint()));
            fenceDetails.put("points", serializedPoints);
            fenceDetails.put("ttl", fence.getFence().getTtl());

            fenceMetadata.put("status", fence.getStatus().toString());
            fenceMetadata.put("retrievalTime", fence.getRetrievalTime().toString());
            ApproachDetails approachDetails = fence.getApproachDetails();
            if(approachDetails != null) {
                JSONObject serializedApproachDetails = new JSONObject();
                serializedApproachDetails.put("isApproaching", approachDetails.isApproaching());
                serializedApproachDetails.put("reciprocalBearing", approachDetails.getReciprocalBearing());
                serializedApproachDetails.put("evasiveBearing", approachDetails.getEvasiveBearing());
                fenceMetadata.put("approachDetails", serializedApproachDetails);
            }

            serializedFence.put("fence", fenceDetails);
            serializedFence.put("meta", fenceMetadata);

            fenceList.add(serializedFence);
        }
        serializedState.put("fences", new JSONArray(fenceList));
        serializedState.put("geodomain", serializeWatchedGeodomain(agentState.getGeodomain()));

        return serializedState;
    }

    private static JSONObject serializeWatchedGeodomain(WatchedGeodomain watchedGeodomain) throws JSONException {
        JSONObject serializedWatchedGeodomain = new JSONObject();
        JSONObject serializedStatus = new JSONObject();

        serializedStatus.put("status", watchedGeodomain.getGeodomainStatus());
        serializedStatus.put("retrievalTime", watchedGeodomain.getRetrievalTime());

        serializedWatchedGeodomain.put("geodomain", serializeGeodomain(watchedGeodomain.raw()));
        serializedWatchedGeodomain.put("status", serializedStatus);

        return serializedWatchedGeodomain;
    }
    private static JSONObject serializeGeodomain(Geodomain geodomain) throws JSONException {
        JSONObject serializedGeodomain = new JSONObject();

        ArrayList<JSONObject> requirementList = new ArrayList<JSONObject>();
        for(Requirement requirement : geodomain.getRequirements()) {
            requirementList.add(serializeRequirement(requirement, geodomain.getDomainName()));
        }
        JSONArray serializedRequirements = new JSONArray(requirementList);

        serializedGeodomain.put("requirements", serializedRequirements);
        serializedGeodomain.put("ttl", geodomain.getTtl());
        serializedGeodomain.put("domainName", geodomain.getDomainName());
        serializedGeodomain.put("identifier", geodomain.getIdentifier());
        return serializedGeodomain;
    }

    private static JSONObject serializeRequirement(Requirement requirement, String geodomain) throws JSONException {
        JSONObject serializedRequirement = new JSONObject();
        serializedRequirement.put("baseType", requirement.getBaseType().toString());
        switch(requirement.getBaseType()) {
            case COLOR:
                ColorRequirement colorRequirement = (ColorRequirement) requirement;
                serializedRequirement.put("red", colorRequirement.getRed());
                serializedRequirement.put("green", colorRequirement.getGreen());
                serializedRequirement.put("blue", colorRequirement.getBlue());
                serializedRequirement.put("alpha", colorRequirement.getAlpha());
                break;
            case BOOLEANSET:
                BooleanSetRequirement boolsetRequirement = (BooleanSetRequirement) requirement;
                serializedRequirement.put("bool0", boolsetRequirement.isBit0());
                serializedRequirement.put("bool1", boolsetRequirement.isBit1());
                serializedRequirement.put("bool2", boolsetRequirement.isBit2());
                serializedRequirement.put("bool3", boolsetRequirement.isBit3());
                serializedRequirement.put("bool4", boolsetRequirement.isBit4());
                serializedRequirement.put("bool5", boolsetRequirement.isBit5());
                serializedRequirement.put("bool6", boolsetRequirement.isBit6());
                serializedRequirement.put("bool7", boolsetRequirement.isBit7());
                serializedRequirement.put("bool8", boolsetRequirement.isBit8());
                serializedRequirement.put("bool9", boolsetRequirement.isBit9());
                serializedRequirement.put("bool10", boolsetRequirement.isBit10());
                serializedRequirement.put("bool11", boolsetRequirement.isBit11());
                serializedRequirement.put("bool12", boolsetRequirement.isBit12());
                serializedRequirement.put("bool13", boolsetRequirement.isBit13());
                serializedRequirement.put("bool14", boolsetRequirement.isBit14());
                serializedRequirement.put("bool15", boolsetRequirement.isBit15());
                break;
            case THRESHOLD:
                ThresholdRequirement thresholdRequirement = (ThresholdRequirement) requirement;
                serializedRequirement.put("lowerBound", thresholdRequirement.getLower());
                serializedRequirement.put("upperBound", thresholdRequirement.getUpper());
                serializedRequirement.put("unit", thresholdRequirement.getUnit().toString());
                break;
            case INTERVAL:
                IntervalRequirement intervalRequirement = (IntervalRequirement) requirement;
                serializedRequirement.put("unit", intervalRequirement.getUnit().toString());
                serializedRequirement.put("initialState", intervalRequirement.getInterval().getInitialState());
                serializedRequirement.put("floor", intervalRequirement.getInterval().getFloor());
                serializedRequirement.put("ceiling", intervalRequirement.getInterval().getCeiling());
                serializedRequirement.put("stateChanges", new JSONArray(intervalRequirement.getInterval().getStateChanges()));
                break;
            case PROFILE:
                ProfileRequirement profileRequirement = (ProfileRequirement) requirement;
                serializedRequirement.put("value", profileRequirement.getValue());
                break;
            case BLOB:
                throw new BlobRequirementsUnsupportedException(geodomain);
        }
        return serializedRequirement;
    }

    private static JSONObject serializeAgentStateUpdate(AgentStateUpdate<Void> agentStateUpdate) throws JSONException {
        JSONObject serializedUpdate = new JSONObject();
        serializedUpdate.put("oldSnapshot", serializeAgentState(agentStateUpdate.getOldSnapshot()));
        serializedUpdate.put("newSnapshot", serializeAgentState(agentStateUpdate.getNewSnapshot()));
        return serializedUpdate;
    }

    private static JSONArray serializePoint(Point point) throws JSONException {
        ArrayList<Double> serializedPoint = new ArrayList<Double>();
        serializedPoint.add(point.getLongitude());
        serializedPoint.add(point.getLatitude());
        return new JSONArray(serializedPoint);
    }

    private static JSONObject serializeAgentStatus(FencingAgent<Void> fa) throws JSONException {
        JSONObject serializedAgentStatus = new JSONObject();
        try {
            serializedAgentStatus.put("isRunning", fa.isRunning());
            serializedAgentStatus.put("geodomain", fa.getRawGeodomain().getDomainName());
        } catch(NullPointerException npe) {
            return serializedAgentStatus;
        }
        return serializedAgentStatus;
    }

    private static void log(String message) {
        Log.i(LOG_TAG, message);
    }
    private static void logError(Throwable throwable) {
        Log.e(LOG_TAG, throwable.getMessage());
        StackTraceElement[] stackTrace = throwable.getStackTrace();
        for(StackTraceElement element : stackTrace) {
            Log.e(LOG_TAG, element.toString());
        }
    }
}
