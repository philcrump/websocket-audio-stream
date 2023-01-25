"use strict";

let channels_ui;
let handsets_ui;

var console = (function() {

    function source(s) {
      if (self.importScripts) {
        return '<span style="color:red;">worker_log:</span> ';
      } else {
        return '<span style="color:green;">thread:</span> ';
      }
    }

    function log(str) {
      var elem = document.getElementById('result');
      var log = function(s) {
       elem.innerHTML += ''.concat((new Date().toISOString()), ' ', s, '\n');
      };
      log(str);
    }

    function getScriptName() {

        var error = new Error();
        var source = null;
        var lastStackFrameRegex = new RegExp(/.+\/(.*?):\d+(:\d+)*$/);
        var currentStackFrameRegex = new RegExp(/getScriptName \(.+\/(.*):\d+:\d+\)/);

        // if((source = lastStackFrameRegex.exec(error.stack.trim())) && source[1] != "")
        if((source = lastStackFrameRegex.exec(error.stack.trim())) && source[1] !== "")
            return source[1];
        else if((source = currentStackFrameRegemanax.exec(error.stack.trim())))
            return source[1];
        else if(error.fileName !== undefined)
            return error.fileName;
    }

    return {

        log : function(given_str) {

            if (typeof given_str === "string" && given_str.indexOf("worker_log") > -1) {

                log(given_str);

            } else {

                log(getScriptName() + " " + source() + given_str);
            }
        }
    };
}());

/* Configuration loaded from API */
let channels_config = [
    {
      'uid': '3jdighdgwu49',
      'title': 'Stream A',
      'audio_url': '/audioa',
      'queue_low': 7,
      'queue_high': 13,
      'queue_max': 20,
      'participants': [
        {
          'name': 'A'
        },
        {
          'name': 'B'
        }
      ]
    },
    {
      'uid': '6jfd83jdj6jd83',
      'title': 'Stream B',
      'audio_url': '/audiob',
      'queue_low': 7,
      'queue_high': 13,
      'queue_max': 20,
      'participants': [
        {
          'name': 'A'
        },
        {
          'name': 'B'
        }
      ]
    }
];

/* DOM References */
let channels_elements = {};

/* Runtime data */
let channels_data = {};

const channels_view = {
  view: function()
  {
    if(channels_config === null || channels_config.length === 0)
    {
      return [];
    }

    let _date_now = Date.now();

    return [
      m("h2", 'Intercom Channels'),
      channels_config.map((channel) => {
        return m("div", {'class': 'card channel-card', 'id': `channel-${channel.uid}`}, [
            m("div", {'class': 'card-body row'}, [
              m("div", {'class': 'col-6'}, [
                m("h4", {'class': 'card-title'}, `${channel.title}`),
                m("canvas", {'class': 'channel-oscilloscope d-block', 'height': 30, 'width': 120}), /* canvas height/width have to be set in HTML, not CSS */
                m("span", {'class': 'channel-volumecontrol-label me-2'}, "Volume:"),
                m("input", {'type': 'range', 'class': 'form-range channel-volumecontrol', 'disabled': true, 'min': 0.0, 'max': 1.0, 'step': 0.05}),
                m("button", {'type': 'button', 'class': 'btn btn-warning channel-togglebutton d-block', 'disabled': true}, 'Loading..'),
                m("meter", {
                  'class': 'channel-queuemeter',
                  'min': 0,
                  'low': channel['queue_low'],
                  'high': channel['queue_high'],
                  'max': channel['queue_max'],
                  'value': channels_data[channel.uid].audioqueue
                }),
                m("span", {'class': 'ms-2'}, `Buffer: ${channels_data[channel.uid].audioqueue}`)
              ]),
              m("div", {'class': 'col-3 pt-2'}, [
                m("h6", `Participants`),
                Object.keys(channels_data[channel.uid].participants_last_active).map((participant_name) => {
                  return m("span", {'class': `badge participant-indicator rounded-pill ${(channels_data[channel.uid].participants_last_active[participant_name] + 500) > _date_now ? 'text-bg-primary' : 'text-bg-secondary'} d-block mb-1`}, `${participant_name}`);
                })
              ]),
            ])
          ]);
      })
    ];
  }
}

let handsets_config = [
    {
      'uid': '345ggw',
      'title': 'A',
      'screen_url': 'http://192.168.200.1/screen.bmp'
    },
    {
      'uid': 'weqty54',
      'title': 'B',
      'screen_url': 'http://192.168.200.2/screen.bmp'
    }
];

const handsets_view = {
  view: function()
  {
    if(handsets_config === null || channels_config.length === 0)
    {
      return [];
    }

    let _date_now = Date.now();

    return [
      m("h2", 'Handsets'),
      handsets_config.map((handset) => {
        return m("div", {'class': 'card handset-card', 'id': `handset-${handset.uid}`}, [
            m("div", {'class': 'card-body row'}, [
                m("h4", {'class': 'card-title'}, `${handset.title}`),
              m("div", {'class': 'col-6'}, [
                m("img", {'src': `${handset.screen_url}`})
              ]),
            ])
          ]);
      })
    ];
  }
}

function channel_oscilloscope_init(canvas, ctx)
{
  const devicePixelRatio = window.devicePixelRatio || 1,
  backingStoreRatio = ctx.webkitBackingStorePixelRatio ||
                    ctx.mozBackingStorePixelRatio ||
                    ctx.msBackingStorePixelRatio ||
                    ctx.oBackingStorePixelRatio ||
                    ctx.backingStorePixelRatio || 1,
  ratio = devicePixelRatio / backingStoreRatio;

  if (devicePixelRatio !== backingStoreRatio)
  {
      var oldWidth = canvas.width;
      var oldHeight = canvas.height;

      canvas.width = oldWidth * ratio;
      canvas.height = oldHeight * ratio;

      canvas.style.width = oldWidth + 'px';
      canvas.style.height = oldHeight + 'px';

      ctx.scale(ratio, ratio);
  }

  ctx.fillStyle = "rgb(200, 200, 200)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgb(0, 0, 0)";
  ctx.beginPath();
  ctx.moveTo(0, Math.round(canvas.height/2.0));
  ctx.lineTo(canvas.width, Math.round(canvas.height/2.0));
  ctx.stroke();
}

function channel_oscilloscope_draw(canvas, canvasCtx, dataArray)
{
    const WIDTH = canvas.width;
    const HEIGHT = canvas.height;
    const bufferLength = dataArray.length;
    const sliceWidth = WIDTH / bufferLength;

    canvasCtx.fillStyle = "rgb(200, 200, 200)";
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = "rgb(0, 0, 0)";
    canvasCtx.beginPath();

    let x = 0;
    for (let i = 0; i < bufferLength; i++)
    {
      const y = Math.round((dataArray[i] / 128.0) * (HEIGHT / 2));

      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }
    canvasCtx.lineTo(WIDTH, HEIGHT / 2);
    canvasCtx.stroke();
}

window.addEventListener('load', () =>
{
  channels_ui = document.getElementById("channels-ui");
  handsets_ui = document.getElementById("handsets-ui");

  /* Create data objects */
  for (const channel of channels_config)
  {
    channels_data[channel.uid] = {};
    channels_data[channel.uid].audioqueue = 0;
    channels_data[channel.uid].audio_analyser_dataframe = null;

    channels_data[channel.uid].participants_last_active = {};
    for (const partipant of channel.participants)
    {
      channels_data[channel.uid].participants_last_active[partipant.name] = 0;
    }
  }

  m.mount(channels_ui, channels_view);



  m.mount(handsets_ui, handsets_view);

  /* Force render before we retrieve references */
  m.redraw();

  for (const channel of channels_config)
  {
    channels_elements[channel.uid] = {};
    channels_elements[channel.uid].ui_root = document.getElementById(`channel-${channel.uid}`);
    channels_elements[channel.uid].ui_oscilloscope = channels_elements[channel.uid].ui_root.querySelector('.channel-oscilloscope');
    channels_elements[channel.uid].ui_oscilloscope_ctx = channels_elements[channel.uid].ui_oscilloscope.getContext('2d');
    channels_elements[channel.uid].ui_queuemeter = channels_elements[channel.uid].ui_root.querySelector('.channel-queuemeter');
    channels_elements[channel.uid].ui_togglebutton = channels_elements[channel.uid].ui_root.querySelector('.channel-togglebutton');
    channels_elements[channel.uid].ui_volumecontrol = channels_elements[channel.uid].ui_root.querySelector('.channel-volumecontrol');

    channel_oscilloscope_init(channels_elements[channel.uid].ui_oscilloscope, channels_elements[channel.uid].ui_oscilloscope_ctx);

    /* Create Browser Audio Interface */
    channels_elements[channel.uid].web_audio_obj = Object.create(render_streaming_web_audio());

    /* Create Websocket Worker */
    channels_elements[channel.uid].ws_worker_handle = new Worker(`ww_client_socket.js?url=${channel.audio_url}`);
    channels_elements[channel.uid].ws_worker_handle.onmessage = function(event)
    {
      if (event.data instanceof ArrayBuffer) {

        let retrieved_audio_buffer_obj = {};
        retrieved_audio_buffer_obj.buffer = new Float32Array(event.data);

        channels_elements[channel.uid].web_audio_obj.cb_send_buffer_to_web_audio_player(retrieved_audio_buffer_obj);

      } else if (event.data instanceof String) {

          let received_jsonobj = null;
          try {
              received_jsonobj = JSON.parse(event.data);
          }
          catch {
              console.log("ERROR - failed to parse JSON received on websocket");
          }

          console.log(JSON.stringify(event.data));

      } else if (event.data instanceof Object) {

        if(typeof event.data.participants != 'undefined' && event.data.participants.length > 0)
        {
          for(const active_partipicant of event.data.participants)
          {
            channels_data[channel.uid].participants_last_active[active_partipicant] = Date.now();
          }
        }

        //console.log(JSON.stringify(event.data));

      } else {
          console.log("ERROR - received unknown from ws - here is event.data []");
          console.log(JSON.stringify(event.data));
      }
    };

    setTimeout(() =>
    {

      setInterval(function() {
          channels_data[channel.uid].audioqueue = channels_elements[channel.uid].web_audio_obj.get_buffer_state();
          channels_data[channel.uid].audio_analyser_dataframe = channels_elements[channel.uid].web_audio_obj.get_analyser_dataframe();

          if(channels_elements[channel.uid].web_audio_obj.is_playing())
          {
            channels_elements[channel.uid].ui_togglebutton.textContent = "Playing";
            channels_elements[channel.uid].ui_togglebutton.disabled = true;
          }
          else if(channels_elements[channel.uid].web_audio_obj.queue.is_play_recommended())
          {
            channels_elements[channel.uid].ui_togglebutton.disabled = false;
            channels_elements[channel.uid].ui_togglebutton.textContent = "Start";
            channels_elements[channel.uid].ui_volumecontrol.disabled = false;
          }
          else
          {
            channels_elements[channel.uid].ui_togglebutton.textContent = "Buffering";
            channels_elements[channel.uid].ui_togglebutton.disabled = true;
          }

          channel_oscilloscope_draw(
            channels_elements[channel.uid].ui_oscilloscope,
            channels_elements[channel.uid].ui_oscilloscope_ctx,
            channels_data[channel.uid].audio_analyser_dataframe
          );

          m.redraw();
      }, 100);

    }, 100);

    channels_elements[channel.uid].ui_togglebutton.addEventListener('click', () =>
    {
      channels_elements[channel.uid].web_audio_obj.resume();
    }, false);

    channels_elements[channel.uid].ui_volumecontrol.addEventListener('input', (e) =>
    {
      channels_elements[channel.uid].web_audio_obj.set_volume(e.target.valueAsNumber);
    }, false);
  }


});

/* Worker comms */
// ww_handle.postMessage(JSON.stringify({'command': 'do_this_thing'}));