class AudioComponent extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.state = {'loading': true, 'data': null, 'waveform': null};
    this.ws = new WebSocket("ws://127.0.0.1:5678/");

    this.ws.onopen = (ev) => {
      this.ws.send(JSON.stringify({'type': 'get_audio', 'data': {'link': this.props.audioLink}}));
    };

    this.ws.onmessage = (ev) => {
      if (ev.data instanceof Blob) {
        this.setState({'data': ev.data})
      } else {
        let data = JSON.parse(ev.data);
        if (data.hasOwnProperty('type') && data['type'] === 'waveform') {
          this.setState({'loading': false, 'waveform': data['data']})
        }
      }
      /*let url = URL.createObjectURL(ev.data);
      let sound = new Howl({
        src: [url],
        format: 'mp3'
      });
      sound.play();*/
      //this.setState({'loading': false, 'data': ev.data})
    };
  }

  render() {
    return (
      <div>
        {this.state.loading && <Loading/>}
        {!this.state.loading && <PeaksComponent data={this.state.data} waveform={this.state.waveform}/>}
      </div>
    );
  }
}


class PeaksComponent extends React.Component {
  constructor(props) {
    super(props);
    ReactDOM.render(
      <source src={URL.createObjectURL(this.props.data)} type={"audio/mp3"}/>,
      document.getElementById('audio')
    );

    var myAudioContext = new AudioContext();

    this.peaks = peaks.init({
      container: document.getElementById('peaks-container'),
      mediaElement: document.getElementById('audio'),
      audioContext: myAudioContext
    });
  }


  render() {
    return (null);
  }
}


class VolumeBar extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this.slider = new Slider("#volume", {reversed: true})
  }

  render() {
    return (
      <div>
        <input id="volume" type={"text"} data-slider-min={"-5"} data-slider-max={"20"} data-slider-step={"1"}
               data-slider-value={"-3"} data-slider-orientation={"vertical"}/>
      </div>
    );
  }
}

function Loading(props) {
  return (
    <div className={"overlay"}>
      <div className={"m-loader mr-20"}>
        <svg className={"m-circular"} viewBox={"25 25 50 50"}>
          <circle className={"path"} cx="50" cy="50" r="20" fill="none" strokeWidth="4" strokeMiterlimit="10"/>
        </svg>
      </div>
      <h3 className={"l-text"}>Loading...</h3>
    </div>
  );
}

function checkForEnter(ev) {
  if (ev.keyCode === 13 || ev.which === 13) {
    submit(ev);
  }
}

function submit() {
  let input = document.getElementById('link');
  ReactDOM.render(
    <AudioComponent audioLink={input.value}/>,
    document.getElementById('container')
  );
}


function PickAudioComponent(props) {
  return(
    <div>
      <p>{props.subText}</p>
      <div className={"input-group mb-3"}>
          <input type={"text"} id={"link"} className={"form-control"} placeholder={"Audio link"} onKeyPress={checkForEnter} aria-label="Audio link" aria-describedby="basic-addon2"/>
          <div className={"input-group-append"}>
            <button className={"btn btn-primary"} type={"button"} onClick={submit}>Submit</button>
          </div>
      </div>
    </div>
  );
}

function JumbotronComponent(props) {
  return (
    <div className={"jumbotron"}>
      <h1 className={"display-4"}>{props.title}</h1>
      <p className={"lead"}>{props.leadText}</p>
      <hr className={"my-4"}/>
      {props.children}
    </div>
  );
}


function pass() {
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

function renderReact() {
  ReactDOM.render(
    <JumbotronComponent title={"Intromaker"} leadText={"Welcome to intromaker"} >
      <PickAudioComponent subText={"Drag and drop a link to type into the box below"}/>
    </JumbotronComponent>,
    document.getElementById('container')
  );
}

function init() {
  renderReact();
}


document.addEventListener('DOMContentLoaded', init, false);
