"use strict";

importScripts('common_utils.js');
importScripts('shared_utils.js');

var send_console_to_browser = (function() {
// var console = (function() {

    function getScriptName() {
        var error = new Error();
        var source = null;
        var lastStackFrameRegex = new RegExp(/.+\/(.*?):\d+(:\d+)*$/);
        var currentStackFrameRegex = new RegExp(/getScriptName \(.+\/(.*):\d+:\d+\)/);

        if((source = lastStackFrameRegex.exec(error.stack.trim())) && source[1] !== "")
            return source[1];
        else if((source = currentStackFrameRegex.exec(error.stack.trim())))
            return source[1];
        else if(error.fileName !== undefined)
            return error.fileName;
    }

    return {

        log : function(given_str) {

            var log_object = {

                type: 'debug',
                msg: common_utils.source() + given_str,
                script_name : getScriptName()
            };

            self.postMessage(log_object);
        }
    };
}());


var websocket_connection = (function() {

	var web_socket = null;
	var flag_connected = false;
	var server_side_buffer_obj = {};

    var MAX_CONN_RETRY = 1000;
    var counter_retry_connection = 0;

    var retry_delay_time = 5;

    var flag_connection_active = true; // start OK if closed then becomes false

    if (! ("WebSocket" in self)) {

        send_console_to_browser.log("websockets is not available on this browser - use firefox");
        return;
    }

    if (flag_connected) {

    	// throw new Error("ERROR - socket already connected ... zap this error msg");
        return; // already connected
    }

    // Extract parameters from query parameters given to worker
    // eg. new Worker(`ww_client_socket.js?host=testhost.org`)
    let parameters = {};
    location.search.slice(1).split("&").forEach( function(key_value) { var kv = key_value.split("="); parameters[kv[0]] = kv[1]; });

    let wsUrl = '';
    if('url' in parameters)
    {
        wsUrl = parameters['url'];
    }
    else
    {
        let wshostname = location.hostname;
        if('host' in parameters)
        {
            wshostname = parameters['host'];

        }

        let wsProtocol = 'ws://';
        if (location.protocol === 'https:')
        {
            wsProtocol = 'wss://';
        }

        wsUrl = `${wsProtocol}${wshostname}/audio`
    }

    web_socket = new WebSocket(wsUrl);


    // following binaryType must be set or you will get this error :
    /* Uncaught TypeError: Failed to construct 'Blob': The 1st argument provided is either null, 
       or an invalid Array object.
    */
    web_socket.binaryType = "arraybuffer"; // stens TODO - added April 30 2014

    // ---

    web_socket.onconnection = function(stream) {
        console.log('WebSocket connect');
    };

    web_socket.onconnected = function(stream) {
        console.log('someone connected!');
    };

    web_socket.onmessage = function(event) {        //      receive message from server side

        // console.log("top of onmessage");

        if (typeof event.data === "string") {

            let received_jsonobj = null;
            try {
                received_jsonobj = JSON.parse(event.data);
            }
            catch {
                send_console_to_browser.log("ERROR - failed to parse JSON received on websocket");
            }

            if(received_jsonobj !== null)
            {
                self.postMessage(received_jsonobj);
            }

        } else if (event.data instanceof ArrayBuffer) {

            server_side_buffer_obj.buffer = new Float32Array(event.data);

            const float_array = new Float32Array(server_side_buffer_obj.buffer);

            self.postMessage(float_array.buffer, [float_array.buffer]); // sending array back to browser

        }
    };

    web_socket.onerror = function(error_stream) {

        send_console_to_browser.log('ERROR - fault on socket');

        for (var curr_property in error_stream) {

            if (error_stream.hasOwnProperty(curr_property)) {

                send_console_to_browser.log("error property " + 
                                curr_property + " -->" + error_stream[curr_property] +
                                                "<-- ");
            }
        }
    };

    // ---

    // flag_connected = true; // stens TODO put this in correct callback above

    web_socket.onclose = function(close_event) {

        send_console_to_browser.log("NOTICE - onclose with message");

        flag_connection_active = false;

        // console.log(close_event);

        // shared_utils.show_object(close_event, "ceoeoeoeoeoe   close_event  ", "total", 3);

        // DEBUG
        for (var curr_property in close_event) {

            if (close_event.hasOwnProperty(curr_property)) {

                send_console_to_browser.log("curr_property " + 
                                        curr_property + " -->" + close_event[curr_property] +
                                                        "<-- ");
            }
        }

    };

    web_socket.onopen = function(){

        send_console_to_browser.log("/audio websocket open..");

        flag_connected = true; // stens TODO put this in correct callback above
    };


	return {

		init : function() {

		},
        close_socket : function() {

            send_console_to_browser.log("NOTICE - about to close socket intentionally");

            web_socket.close();

        }
	};
}());      //      websocket_connection

self.onmessage = function(event) {  //    retrieved a message from browser

    if (typeof event.data === "string")
    {
        const received_json = JSON.parse(event.data);

        if (typeof received_json.command !== "undefined")
        {

            switch (received_json.command) { // mode 3

                case "setup_stream_audio_from_server" : {

                    setup_stream_audio_from_server(received_json);

                    break;
                }

                default : {

                    send_console_to_browser.log("ERROR - invalid browser_directed_mode : " + 
                                    received_json.browser_directed_mode + JSON.stringify(received_json));
                }
            }

        } else {

            send_console_to_browser.log("ERROR - worker received malformed request.");
        }

    } else {

        send_console_to_browser.log("ERROR - worker received non-string message from browser");
    }
};

//websocket_connection.init();
