const stream = new MediaStream();
const suuid = $('#suuid').val();

const config = {
  iceServers: [{
    urls: ["stun:stun.l.google.com:19302"]
  }]
};

const pc = new RTCPeerConnection(config);
pc.onnegotiationneeded = handleNegotiationNeededEvent;

const log = msg => {
  document.getElementById('div').innerHTML += msg + '<br>';
};

pc.ontrack = function(event) {
  stream.addTrack(event.track);
  videoElem.srcObject = stream;
  log(event.streams.length + ' track is delivered');
};

pc.oniceconnectionstatechange = e => log(pc.iceConnectionState);

async function handleNegotiationNeededEvent() {
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    getRemoteSdp();
    $.get("../codec/" + suuid, function(data) {
      try {
        data = JSON.parse(data);
        data.forEach(value => {
          pc.addTransceiver(value.Type, {
            'direction': 'sendrecv'
          });
        });
        //send ping becouse PION not handle RTCSessionDescription.close()
        sendChannel = pc.createDataChannel('foo');
        sendChannel.onclose = () => console.log('sendChannel has closed');
        sendChannel.onopen = () => {
          console.log('sendChannel has opened');
          sendChannel.send('ping');
          setInterval(() => {
            sendChannel.send('ping');
          }, 1000);
        };
        sendChannel.onmessage = e => log(`Message from DataChannel '${sendChannel.label}' payload '${e.data}'`);
      } catch (e) {
        console.log(e);
      }
    });
  } catch (e) {
    console.log(e);
  }
}

$(document).ready(function() {
  $('#' + suuid).addClass('active');
  getCodecInfo();
});

function getCodecInfo() {
  $.get("../codec/" + suuid, function(data) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      console.log(e);
    }
  });
}

let sendChannel = null;

function getRemoteSdp() {
  $.post("../receiver/"+ suuid, {
    suuid: suuid,
    data: btoa(pc.localDescription.sdp)
  }, function(data) {
    try {
      const response = atob(data);
      if (!response) {
        throw new Error('Invalid response from server');
      }
      pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: response
      }));
    } catch (e) {
      console.warn(e);
    }
  });
}
