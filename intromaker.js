const WEBSOCKET_LOCATION = "ws://138.68.146.133:5678/";

class AudioComponent extends React.Component {
  constructor(props) {
    super(props);
    this.props = props;
    this.state = {'loading': true, 'data': null, 'waveform': null, 'title': null};
    this.ws = new WebSocket(WEBSOCKET_LOCATION);

    this.ws.onopen = (ev) => {
      this.ws.send(JSON.stringify({'type': 'get_audio', 'data': {'link': this.props.audioLink}}));
    };

    this.ws.onmessage = (ev) => {
      if (ev.data instanceof Blob) {
        this.setState({'data': ev.data})
      } else {
        let data = JSON.parse(ev.data);
        if (data.hasOwnProperty('type') && data['type'] === 'audio_data') {
          this.setState({
            'loading': false,
            'waveform': JSON.stringify(data['data']['waveform']),
            'title': data['data']['title']
          })
        }
      }
    };
  }

  render() {
    if (this.state.loading) {
      return <Loading/>;
    } else {
      return (
        <PeaksComponent title={this.state.title} data={this.state.data} waveform={this.state.waveform} link={this.props.audioLink}/>
      );
    }
  }
}

function detectMouseWheelDirection( e )
{
    var delta = null,
        direction = false
    ;
    if ( !e ) { // if the event is not provided, we get it from the window object
        e = window.event;
    }
    if ( e.wheelDelta ) { // will work in most cases
        delta = e.wheelDelta / 60;
    } else if ( e.detail ) { // fallback for Firefox
        delta = -e.detail / 2;
    }
    if ( delta !== null ) {
        direction = delta > 0 ? 'up' : 'down';
    }

    return direction;
}

class PeaksComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {'playing': false, segment: false, 'downloading': false};
    ReactDOM.render(
      <source src={URL.createObjectURL(this.props.data)} type={"audio/mp3"}/>,
      document.getElementById('audio')
    );

    ReactDOM.render(
      <h1 className={"display-3"}>{this.props.title}</h1>,
      document.getElementById('title')
    );

    let instance = peaks.init({
      container: document.getElementById('peaks-container'),
      mediaElement: document.getElementById('audio'),
      dataUri: URL.createObjectURL(new Blob([this.props.waveform], {type: 'application/json'})),
      showPlayheadTime: true,
      zoomLevels: [64, 128, 256, 512, 1024, 2048, 4096]
    });

    this.instance = instance;
    this.handlePlayButtonClick = this.handlePlayButtonClick.bind(this);
    this.handleSegment = this.handleSegment.bind(this);
    this.handleDownload = this.handleDownload.bind(this);

    document.getElementById('peaks-container').addEventListener('wheel', (ev) => {
      ev.preventDefault();
      let direction = detectMouseWheelDirection(ev);
      if (direction === 'down') {
        instance.zoom.zoomOut();
      } else if (direction === 'up') {
        instance.zoom.zoomIn();
      }
    });

    let component = this;
    document.getElementById('audio').addEventListener('pause', (ev) => {
      component.setState({'playing': false})
    });
  }

  handlePlayButtonClick() {
    if (this.state.playing) {
        this.instance.player.pause();
    } else {
      if (this.state.segment) {
        this.instance.player.playSegment(this.instance.segments.getSegment(1));
      } else {
        this.instance.player.play();
      }
    }
    this.setState({'playing': !this.state.playing})
  }

  handleSegment() {
    if (!this.state.segment) {
      this.instance.segments.add({
        'startTime': this.instance.player.getCurrentTime(),
        'endTime': this.instance.player.getCurrentTime()+5,
        'editable': true,
        'color': '#007bff',
        'labelText': 'Audio segment to download',
        'id': 1
      });
    } else {
      this.instance.segments.removeAll();
    }
    this.setState({segment: !this.state.segment})
  }

  handleDownload() {
    if (this.state.segment) {
      this.ws = new WebSocket(WEBSOCKET_LOCATION);

      let segment = this.instance.segments.getSegment(1);

      this.ws.onopen = (ev) => {
        this.setState({'downloading': true});
        this.ws.send(JSON.stringify({
          'type': 'cut_audio',
          'data': {'link': this.props.link, 'start_pos': segment.startTime, 'end_pos': segment.endTime}
        }));
      };

      this.ws.onmessage = (ev) => {
        this.setState({'downloading': false});
        saveAs(ev.data, this.props.title + ".mp3")
      };
    } else {
      saveAs(this.props.data, this.props.title + ".mp3")
    }
  }

  render() {
    return (
      <div className={"row justify-content-md-center"}>
        <div className={"col-6"}>
          <div className={"row"}>
            {this.state.playing && <button type={"button"} onClick={this.handlePlayButtonClick} className={"btn btn-primary btn-lg mr-3"}><i className={"fas fa-pause"}/></button>}
            {!this.state.playing && <button type={"button"} onClick={this.handlePlayButtonClick} className={"btn btn-primary btn-lg mr-3"}><i className={"fas fa-play"}/></button>}
            {this.state.segment && <button type={"button"} onClick={this.handleSegment} className={"btn btn-primary btn-lg"}><i className={"fas fa-minus"}/>  Remove Segment</button>}
            {!this.state.segment && <button type={"button"} onClick={this.handleSegment} className={"btn btn-primary btn-lg"}><i className={"fas fa-plus"}/>  Insert Segment</button>}
          </div>
        </div>
        <div className={"col"}>
          <button type={"button"} onClick={!this.state.downloading ? this.handleDownload : null} className={"btn btn-primary btn-lg"} disabled={this.state.downloading}><i className={"fas fa-download"}/>{this.state.downloading ? "  Downloading..." : this.state.segment ? "  Download Segment" : "  Download Whole Audio"}</button>
        </div>
      </div>
    );
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
