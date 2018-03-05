
const ws = new WebSocket("ws://127.0.0.1:5678/");

ws.addEventListener('open', function (ev) {

});

ws.addEventListener('message', function (ev) {
  console.log(ev.data);
  let url = URL.createObjectURL(ev.data);
  let sound = new Howl({
    src: [url],
    format: 'mp3'
  });
  sound.play();
});


function init() {
  let submit = document.getElementById('yt_submit');
  let input_field = document.getElementById('input_field');
  let start_pos = document.getElementById('start_pos');
  let end_pos = document.getElementById('end_pos');
  submit.onsubmit = function (ev) {
    ev.preventDefault();
    console.log(input_field.value);
    if (start_pos.value === '') {
      ws.send(JSON.stringify({'type': 'get_audio', 'data': {'link': input_field.value}}));
    } else {
      ws.send(JSON.stringify({'type': 'cut_audio', 'data': {'link': input_field.value, 'start_pos': start_pos.value, 'end_pos': end_pos.value}}));
    }
  }
}

document.addEventListener('DOMContentLoaded', init, false);
