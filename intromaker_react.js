'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WEBSOCKET_LOCATION = "wss://intro.ohminator.com:8080/";

var AudioComponent = function (_React$Component) {
  _inherits(AudioComponent, _React$Component);

  function AudioComponent(props) {
    _classCallCheck(this, AudioComponent);

    var _this = _possibleConstructorReturn(this, (AudioComponent.__proto__ || Object.getPrototypeOf(AudioComponent)).call(this, props));

    _this.props = props;
    _this.state = { 'loading': true, 'data': null, 'waveform': null, 'title': null };
    _this.ws = new WebSocket(WEBSOCKET_LOCATION);

    _this.ws.onopen = function (ev) {
      _this.ws.send(JSON.stringify({ 'type': 'get_audio', 'data': { 'link': _this.props.audioLink } }));
    };

    _this.ws.onmessage = function (ev) {
      if (ev.data instanceof Blob) {
        _this.setState({ 'data': ev.data });
      } else {
        var data = JSON.parse(ev.data);
        if (data.hasOwnProperty('type') && data['type'] === 'audio_data') {
          _this.setState({
            'loading': false,
            'waveform': JSON.stringify(data['data']['waveform']),
            'title': data['data']['title']
          });
        }
      }
    };
    return _this;
  }

  _createClass(AudioComponent, [{
    key: 'render',
    value: function render() {
      if (this.state.loading) {
        return React.createElement(Loading, null);
      } else {
        return React.createElement(PeaksComponent, { title: this.state.title, data: this.state.data, waveform: this.state.waveform, link: this.props.audioLink });
      }
    }
  }]);

  return AudioComponent;
}(React.Component);

function detectMouseWheelDirection(e) {
  var delta = null,
      direction = false;
  if (!e) {
    // if the event is not provided, we get it from the window object
    e = window.event;
  }
  if (e.wheelDelta) {
    // will work in most cases
    delta = e.wheelDelta / 60;
  } else if (e.detail) {
    // fallback for Firefox
    delta = -e.detail / 2;
  } else if (e.deltaY) {
    delta = -e.deltaY;
  }
  if (delta !== null) {
    direction = delta > 0 ? 'up' : 'down';
  }

  return direction;
}

var PeaksComponent = function (_React$Component2) {
  _inherits(PeaksComponent, _React$Component2);

  function PeaksComponent(props) {
    _classCallCheck(this, PeaksComponent);

    var _this2 = _possibleConstructorReturn(this, (PeaksComponent.__proto__ || Object.getPrototypeOf(PeaksComponent)).call(this, props));

    _this2.state = { 'playing': false, segment: false, 'downloading': false };
    ReactDOM.render(React.createElement('source', { src: URL.createObjectURL(_this2.props.data), type: "audio/mp3" }), document.getElementById('audio'));

    ReactDOM.render(React.createElement(
      'h1',
      { className: "display-3" },
      _this2.props.title
    ), document.getElementById('title'));

    var instance = peaks.init({
      container: document.getElementById('peaks-container'),
      mediaElement: document.getElementById('audio'),
      dataUri: URL.createObjectURL(new Blob([_this2.props.waveform], { type: 'application/json' })),
      showPlayheadTime: true,
      zoomLevels: [64, 128, 256, 512, 1024, 2048, 4096]
    });

    _this2.instance = instance;
    _this2.handlePlayButtonClick = _this2.handlePlayButtonClick.bind(_this2);
    _this2.handleSegment = _this2.handleSegment.bind(_this2);
    _this2.handleDownload = _this2.handleDownload.bind(_this2);

    document.getElementById('peaks-container').addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var direction = detectMouseWheelDirection(ev);
      if (direction === 'down') {
        instance.zoom.zoomOut();
      } else if (direction === 'up') {
        instance.zoom.zoomIn();
      }
    });

    var component = _this2;
    document.getElementById('audio').addEventListener('pause', function (ev) {
      component.setState({ 'playing': false });
    });
    return _this2;
  }

  _createClass(PeaksComponent, [{
    key: 'handlePlayButtonClick',
    value: function handlePlayButtonClick() {
      if (this.state.playing) {
        this.instance.player.pause();
      } else {
        if (this.state.segment) {
          this.instance.player.playSegment(this.instance.segments.getSegment(1));
        } else {
          this.instance.player.play();
        }
      }
      this.setState({ 'playing': !this.state.playing });
    }
  }, {
    key: 'handleSegment',
    value: function handleSegment() {
      if (!this.state.segment) {
        this.instance.segments.add({
          'startTime': this.instance.player.getCurrentTime(),
          'endTime': this.instance.player.getCurrentTime() + 5,
          'editable': true,
          'color': '#007bff',
          'labelText': 'Audio segment to download',
          'id': 1
        });
      } else {
        this.instance.segments.removeAll();
      }
      this.setState({ segment: !this.state.segment });
    }
  }, {
    key: 'handleDownload',
    value: function handleDownload() {
      var _this3 = this;

      if (this.state.segment) {
        this.ws = new WebSocket(WEBSOCKET_LOCATION);

        var segment = this.instance.segments.getSegment(1);

        this.ws.onopen = function (ev) {
          _this3.setState({ 'downloading': true });
          _this3.ws.send(JSON.stringify({
            'type': 'cut_audio',
            'data': { 'link': _this3.props.link, 'start_pos': segment.startTime, 'end_pos': segment.endTime }
          }));
        };

        this.ws.onmessage = function (ev) {
          _this3.setState({ 'downloading': false });
          saveAs(ev.data, _this3.props.title + ".mp3");
        };
      } else {
        saveAs(this.props.data, this.props.title + ".mp3");
      }
    }
  }, {
    key: 'render',
    value: function render() {
      return React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { className: "row justify-content-md-center" },
          React.createElement(
            'div',
            { className: "col-6" },
            React.createElement(
              'div',
              { className: "row" },
              this.state.playing && React.createElement(
                'button',
                { type: "button", onClick: this.handlePlayButtonClick, className: "btn btn-primary btn-lg mr-3" },
                React.createElement('i', { className: "fas fa-pause" })
              ),
              !this.state.playing && React.createElement(
                'button',
                { type: "button", onClick: this.handlePlayButtonClick, className: "btn btn-primary btn-lg mr-3" },
                React.createElement('i', { className: "fas fa-play" })
              ),
              this.state.segment && React.createElement(
                'button',
                { type: "button", onClick: this.handleSegment, className: "btn btn-primary btn-lg" },
                React.createElement('i', { className: "fas fa-minus" }),
                '  Remove Segment'
              ),
              !this.state.segment && React.createElement(
                'button',
                { type: "button", onClick: this.handleSegment, className: "btn btn-primary btn-lg" },
                React.createElement('i', { className: "fas fa-plus" }),
                '  Insert Segment'
              )
            )
          ),
          React.createElement(
            'div',
            { className: "col" },
            React.createElement(
              'button',
              { type: "button", onClick: !this.state.downloading ? this.handleDownload : null, className: "btn btn-primary btn-lg", disabled: this.state.downloading },
              React.createElement('i', { className: "fas fa-download" }),
              this.state.downloading ? "  Downloading..." : this.state.segment ? "  Download Segment" : "  Download Whole Audio"
            )
          )
        )
      );
    }
  }]);

  return PeaksComponent;
}(React.Component);

var VolumeBar = function (_React$Component3) {
  _inherits(VolumeBar, _React$Component3);

  function VolumeBar(props) {
    _classCallCheck(this, VolumeBar);

    return _possibleConstructorReturn(this, (VolumeBar.__proto__ || Object.getPrototypeOf(VolumeBar)).call(this, props));
  }

  _createClass(VolumeBar, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      this.slider = new Slider("#volume", { reversed: true });
    }
  }, {
    key: 'render',
    value: function render() {
      return React.createElement(
        'div',
        null,
        React.createElement('input', { id: 'volume', type: "text", 'data-slider-min': "-5", 'data-slider-max': "20", 'data-slider-step': "1",
          'data-slider-value': "-3", 'data-slider-orientation': "vertical" })
      );
    }
  }]);

  return VolumeBar;
}(React.Component);

function Loading(props) {
  return React.createElement(
    'div',
    { className: "overlay" },
    React.createElement(
      'div',
      { className: "m-loader mr-20" },
      React.createElement(
        'svg',
        { className: "m-circular", viewBox: "25 25 50 50" },
        React.createElement('circle', { className: "path", cx: '50', cy: '50', r: '20', fill: 'none', strokeWidth: '4', strokeMiterlimit: '10' })
      )
    ),
    React.createElement(
      'h3',
      { className: "l-text" },
      'Loading...'
    )
  );
}

function checkForEnter(ev) {
  if (ev.keyCode === 13 || ev.which === 13) {
    submit(ev);
  }
}

function submit() {
  var input = document.getElementById('link');
  ReactDOM.render(React.createElement(AudioComponent, { audioLink: input.value }), document.getElementById('container'));
}

function PickAudioComponent(props) {
  return React.createElement(
    'div',
    null,
    React.createElement(
      'p',
      null,
      props.subText
    ),
    React.createElement(
      'div',
      { className: "input-group mb-3" },
      React.createElement('input', { type: "text", id: "link", className: "form-control", placeholder: "Audio link", onKeyPress: checkForEnter, 'aria-label': 'Audio link', 'aria-describedby': 'basic-addon2' }),
      React.createElement(
        'div',
        { className: "input-group-append" },
        React.createElement(
          'button',
          { className: "btn btn-primary", type: "button", onClick: submit },
          'Submit'
        )
      )
    )
  );
}

function JumbotronComponent(props) {
  return React.createElement(
    'div',
    { className: "jumbotron" },
    React.createElement(
      'h1',
      { className: "display-4" },
      props.title
    ),
    React.createElement(
      'p',
      { className: "lead" },
      props.leadText
    ),
    React.createElement('hr', { className: "my-4" }),
    props.children
  );
}

function renderReact() {
  ReactDOM.render(React.createElement(
    JumbotronComponent,
    { title: "Intromaker", leadText: "Welcome to intromaker" },
    React.createElement(PickAudioComponent, { subText: "Drag and drop a link to type into the box below" })
  ), document.getElementById('container'));
}

function init() {
  renderReact();
}

document.addEventListener('DOMContentLoaded', init, false);
//# sourceMappingURL=intromaker.js.map