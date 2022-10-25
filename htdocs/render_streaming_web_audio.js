
var render_streaming_web_audio = function() {

var audio_context;
let audio_analyser;
let audio_analyser_dataArray;
var gain_node;
var streaming_node;
var cb_send_audio_to_server = null;

var BUFF_SIZE_AUDIO_RENDERER = 1024;

var streaming_status_ready      = "streaming_status_ready";
var streaming_status_active     = "streaming_status_active";
var flag_streaming_status       = streaming_status_ready;


// var ignore_console = (function() {
var console = (function() {

    // shared_utils.show_object(scripts, "scripts", "total", 10);

    function getScriptName() {

        var error = new Error();
        var source = null;
        var lastStackFrameRegex = new RegExp(/.+\/(.*?):\d+(:\d+)*$/);
        var currentStackFrameRegex = new RegExp(/getScriptName \(.+\/(.*):\d+:\d+\)/);

        // if((source = lastStackFrameRegex.exec(error.stack.trim())) && source[1] != "")
        if((source = lastStackFrameRegex.exec(error.stack.trim())) && source[1] !== "")
            return source[1];
        else if((source = currentStackFrameRegex.exec(error.stack.trim())))
            return source[1];
        else if(error.fileName !== undefined)
            return error.fileName;
    }


    return {

        log : function(given_str) {

            // common_utils.log(document.currentScript, scriptName + " " + common_utils.source() + given_str);
            // common_utils.log(document.currentScript.toString() + " " + common_utils.source() + given_str);
            common_utils.log(getScriptName() + " " + common_utils.source() + given_str);
        }
    };
}());




var init_web_audio = (function() {

	if (typeof audio_context !== "undefined") {

        return;     //      audio_context already defined
    }

    try {

        window.AudioContext = window.AudioContext       ||
                              window.webkitAudioContext ||
                              window.mozAudioContext    ||
                              window.oAudioContext      ||
                              window.msAudioContext;

        audio_context = new AudioContext({sampleRate: 8000});  //  cool audio context established


    } catch (e) {

        var error_msg = "Web Audio API is not supported by this browser\n" +
                        " ... http://caniuse.com/#feat=audio-api";
        console.error(error_msg);
        alert(error_msg);
        throw new Error(error_msg);
    }

    gain_node = audio_context.createGain();
    gain_node.connect(audio_context.destination);

    audio_analyser = audio_context.createAnalyser();
    audio_analyser.fftSize = 512;
    audio_analyser_dataArray = new Uint8Array(audio_analyser.frequencyBinCount);

}());

function setup_onaudioprocess_callback_stream(given_node, cb_populate_memory_chunk, given_num_channels) {

    console.log("TOP setup_onaudioprocess_callback_stream");

    var internal_audio_buffer_obj = {};
    var aggregate_buffer_index = 0;
    var stop_next_event_loop_iteration = false;

    given_node.onaudioprocess = (function() {

        return function(event) {

            //console.log("Middleburg  top of rendering callback ----------------------------------");

            queue_first_in_first_out.set_flag_audio_rendering(true);

            aggregate_buffer_index += BUFF_SIZE_AUDIO_RENDERER;

            for (var curr_channel = 0; curr_channel < given_num_channels; curr_channel++) {

                internal_audio_buffer_obj[curr_channel] = event.outputBuffer.getChannelData(curr_channel);
            }

            // retrieve buffer data from queue
            cb_populate_memory_chunk(internal_audio_buffer_obj, given_num_channels);
        };
    }());
}           //      setup_onaudioprocess_callback_stream


var queue_first_in_first_out = (function() { // first in first out queue

    var audio_from_server_obj = {};
    var push_index = 0;
    var pop_index = 0;
    var browser_queue_min_threshold = 5;
    var browser_queue_max_size = 20;   //  maximum queue size
    var cb_browser_queue_is_full = null;
    var cb_browser_queue_min_reached = null;
    var curr_browser_queue_size = 0;
    // var cb_get_state = null;
    var max_index = null;

    var flag_index_is_rising = true; // trigger used to identify when traversing min threshold
    var flag_request_stop = false; // trigger to stop web audio api event loop

    var flag_audio_rendering = false;

    return {
        clear : function() {
            push_index = pop_index = 0;
            curr_browser_queue_size = 0;
        },
        push : function(given_audio_obj_from_server) {      // bbb

            const size_buffer_available = given_audio_obj_from_server.buffer.length;

            //console.log(`pus Queue_size: ${push_index - pop_index}, in_size ${size_buffer_available}`);

            var offset_index = 0;
            while (size_buffer_available > offset_index) { // carve out render sized buffers from given buffer

                let target_queue_size = browser_queue_max_size;
                if(audio_context.state === "suspended")
                {
                    /* Aim for halfway */
                    target_queue_size = (browser_queue_max_size / 2);
                }
                while(curr_browser_queue_size >= target_queue_size)
                {
                    /* Queue is full, delete one off the other end first */
                    if (pop_index > 0)
                    {
                        delete audio_from_server_obj[pop_index - 1]; // destroy previously consumed entry
                    }
                    pop_index++;
                    curr_browser_queue_size -= 1;
                }

                var array_buffer = new ArrayBuffer(BUFF_SIZE_AUDIO_RENDERER * Float32Array.BYTES_PER_ELEMENT);
                var float_array = new Float32Array(array_buffer);

                for (var i = 0; i < BUFF_SIZE_AUDIO_RENDERER; i++) {

                    float_array.buffer[i] = given_audio_obj_from_server.buffer[i + offset_index];
                }

                audio_from_server_obj[push_index] = float_array;


                push_index += 1;

                offset_index += BUFF_SIZE_AUDIO_RENDERER;

                curr_browser_queue_size += 1;
            }
        },
        is_pop_possible : function() {

            const curr_size_queue = (push_index - pop_index);

            return (curr_size_queue > 0);
        },
        is_play_recommended : function()
        {
            const curr_size_queue = (push_index - pop_index);

            return (curr_size_queue >= browser_queue_min_threshold);
        },
        pop : function() {

            //console.log(`pop, size: ${push_index - pop_index}`);

            if (pop_index > 0) {

                delete audio_from_server_obj[pop_index - 1]; // destroy previously consumed entry
            }

            if (pop_index < push_index) {

                curr_browser_queue_size -= 1;

                // bbbb useful logging
                //console.log(" POP            browser queue " + curr_browser_queue_size);

                return audio_from_server_obj[pop_index++];

            } else {

                throw new Error("ERROR - boo hoo queue_first_in_first_out is EMPTY so cannot do a pop");
            }
        },
        set_flag_audio_rendering : function() {

            flag_audio_rendering = true;
        },
        get_flag_audio_rendering : function() {

            return flag_audio_rendering;
        },
        get_queue_size : function() {

            return curr_browser_queue_size;
        }
    };
}());       //      queue_first_in_first_out

function get_buffer_state()
{
    return queue_first_in_first_out.get_queue_size();
}

var get_another_buffer = (function () {

    return (function(given_audio_obj, num_channels) {

        if (queue_first_in_first_out.is_pop_possible()) {

            const audio_obj_from_queue = queue_first_in_first_out.pop();

            if (typeof audio_obj_from_queue === "undefined") {

                throw new Error("ERROR - in get_another_buffer seeing undefined audio_obj_from_queue");
            }

            const size_buff = audio_obj_from_queue.length;

            for (var i = 0; i < size_buff; i++) {

                given_audio_obj[0][i] = audio_obj_from_queue.buffer[i];
            }

            //console.log(`get Queue_size: ${queue_first_in_first_out.get_queue_size()}, out_size ${size_buff}`);
        }
    });
}());


function stop_audio() {

    // queue_first_in_first_out.set_stop();

    streaming_node.disconnect(gain_node); // stens TODO why is this not enough to stop event loop

    streaming_node.onaudioprocess = null;

    streaming_node = null;

    console.log('stop_audio ... just called disconnect');

    flag_streaming_status = streaming_status_ready; // get ready for next time

    console.log("OK just set flag_streaming_status = streaming_status_ready");
}

function pause() {
  audio_context.suspend().then(() => {
    console.log('resume: Playback resumed successfully');
  });
}

function resume() {
    //queue_first_in_first_out.clear();
  audio_context.resume().then(() => {
    console.log('resume: Playback resumed successfully');
  });
}

function set_volume(volume_normalised) {
  if(volume_normalised < 0.0) volume_normalised = 0.0;
  if(volume_normalised > 1.0) volume_normalised = 1.0;

  gain_node.gain.setTargetAtTime(volume_normalised, audio_context.currentTime, 0.015);
}

function process_audio_buffer() { // only called upon initially retrieving audio fm svr

    if (queue_first_in_first_out.get_flag_audio_rendering() === false)
    {
        queue_first_in_first_out.set_flag_audio_rendering(true);

        // streaming_node = audio_context.createScriptProcessor(BUFF_SIZE_AUDIO_RENDERER, 1, 1);
        streaming_node = audio_context.createScriptProcessor(BUFF_SIZE_AUDIO_RENDERER, 1, 1);

        streaming_node.connect(gain_node);
        streaming_node.connect(audio_analyser);

        flag_streaming_status = streaming_status_active;

        console.log("OK just set flag_streaming_status    streaming_status_active");

        setup_onaudioprocess_callback_stream(streaming_node, get_another_buffer, 1);

    }
}


function cb_send_buffer_to_web_audio_player(given_audio_obj) {

    queue_first_in_first_out.push(given_audio_obj);

    process_audio_buffer(); // safe to do this since not competing with rendering processing   
}

function get_analyser_dataframe()
{
    audio_analyser.getByteTimeDomainData(audio_analyser_dataArray);
    return audio_analyser_dataArray;
}

return {

    cb_send_buffer_to_web_audio_player : cb_send_buffer_to_web_audio_player,
    queue : queue_first_in_first_out,
    process_audio_buffer : process_audio_buffer,
    get_buffer_state : get_buffer_state,
    pause : pause,
    resume : resume,
    set_volume : set_volume,
    get_analyser_dataframe : get_analyser_dataframe
};

};       //      render_streaming_web_audio
