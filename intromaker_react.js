'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var WEBSOCKET_LOCATION = "wss://intro.ohminator.com:8080/";

var Slider = ReactRangeslider.default;

var AudioComponent = function (_React$Component) {
  _inherits(AudioComponent, _React$Component);

  function AudioComponent(props) {
    _classCallCheck(this, AudioComponent);

    var _this = _possibleConstructorReturn(this, (AudioComponent.__proto__ || Object.getPrototypeOf(AudioComponent)).call(this, props));

    _this.props = props;
    _this.state = { 'loading': true, 'data': null, 'waveform': null, 'title': null, connected: true };
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
          _this.ws.close(1000, "Transaction completed.");
        }
      }
    };

    _this.ws.onerror = function (ev) {
      _this.setState({ 'connected': false });
    };
    return _this;
  }

  _createClass(AudioComponent, [{
    key: 'render',
    value: function render() {
      if (this.state.loading && this.state.connected) {
        return React.createElement(Loading, null);
      } else if (this.state.loading && !this.state.connected) {
        return React.createElement(NoConnectionLoadingNotification, null);
      } else {
        return React.createElement(PeaksComponent, { title: this.state.title, data: this.state.data, waveform: this.state.waveform, link: this.props.audioLink });
      }
    }
  }]);

  return AudioComponent;
}(React.Component);

function NoConnectionLoadingNotification(props) {
  return React.createElement(
    'div',
    { className: "overlay" },
    React.createElement(
      'div',
      { className: "container" },
      React.createElement(
        'div',
        { className: "alert alert-secondary", role: "alert" },
        React.createElement(
          'h4',
          { className: "alert-heading" },
          'Ooops!'
        ),
        React.createElement(
          'p',
          null,
          React.createElement(
            'strong',
            null,
            'Could not connect to the server.'
          ),
          React.createElement('br', null),
          'This could be because of your Internet connection, the server is down or the server is too busy to handle your request.'
        ),
        React.createElement('hr', null),
        React.createElement(
          'p',
          { className: "mb-0" },
          'Please try again. If the problem persists, please notify the developer or wait until the problem is fixed.'
        )
      )
    )
  );
}

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

    _this2.state = { 'playing': false, segment: false, 'downloading': false, volume: 0, 'error_connecting': false };
    ReactDOM.render(React.createElement('source', { src: URL.createObjectURL(_this2.props.data), type: "audio/mp3" }), document.getElementById('audio'));

    ReactDOM.render(React.createElement(
      'h1',
      { className: "display-3" },
      _this2.props.title
    ), document.getElementById('title'));

    _this2.audioCtx = new AudioContext();

    var instance = peaks.init({
      container: document.getElementById('peaks-container'),
      mediaElement: document.getElementById('audio'),
      dataUri: URL.createObjectURL(new Blob([_this2.props.waveform], { type: 'application/json' })),
      showPlayheadTime: true,
      zoomLevels: [64, 128, 256, 512, 1024, 2048, 4096]
    });

    _this2.instance = instance;
    _this2.source = _this2.audioCtx.createMediaElementSource(_this2.instance.player._mediaElement);
    _this2.gainNode = _this2.audioCtx.createGain();
    _this2.source.connect(_this2.gainNode);

    // connect the gain node to an output destination
    _this2.gainNode.connect(_this2.audioCtx.destination);

    _this2.handlePlayButtonClick = _this2.handlePlayButtonClick.bind(_this2);
    _this2.handleSegment = _this2.handleSegment.bind(_this2);
    _this2.handleDownload = _this2.handleDownload.bind(_this2);
    _this2.handleVolumeChange = _this2.handleVolumeChange.bind(_this2);
    //this.handleSegmentChange = this.handleSegmentChange.bind(this);

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

      if (this.state.segment || this.state.volume) {
        this.ws = new WebSocket(WEBSOCKET_LOCATION);

        this.ws.onopen = function (ev) {
          _this3.setState({ 'downloading': true });
          if (_this3.state.segment) {
            var segment = _this3.instance.segments.getSegment(1);
            _this3.ws.send(JSON.stringify({
              'type': 'cut_audio',
              'data': {
                'link': _this3.props.link,
                'start_pos': segment.startTime,
                'end_pos': segment.endTime,
                'volume': _this3.precisionRound(1 + _this3.state.volume / 100, 1)
              }
            }));
          } else {
            _this3.ws.send(JSON.stringify({
              'type': 'cut_audio',
              'data': {
                'link': _this3.props.link,
                'start_pos': 0,
                'end_pos': _this3.precisionRound(document.getElementById("audio").duration, 1),
                'volume': _this3.precisionRound(1 + _this3.state.volume / 100, 1)
              }
            }));
          }
        };

        this.ws.onmessage = function (ev) {
          _this3.setState({ 'downloading': false });
          if (ev.data instanceof Blob) {
            saveAs(ev.data, _this3.props.title + ".mp3");
          } else {
            ReactDOM.render(React.createElement(DownloadingNotification, { message: [React.createElement(
                'strong',
                { key: "de" },
                'Download error!'
              ), " Something went wrong while downloading. Please notify the developer or wait for a fix. Deleting your browser's cache for this site could also help."] }), document.getElementById("notifications"));
          }
          _this3.ws.close(1000, "Finished downloading.");
        };

        this.ws.onerror = function (ev) {
          ReactDOM.render(React.createElement(DownloadingNotification, { message: [React.createElement(
              'strong',
              { key: "nc" },
              'No connection!'
            ), " Please try again later, notify the developer or wait for it to be fixed."] }), document.getElementById("notifications"));
        };
      } else {
        saveAs(this.props.data, this.props.title + ".mp3");
      }
    }
  }, {
    key: 'precisionRound',
    value: function precisionRound(number, precision) {
      var factor = Math.pow(10, precision);
      return Math.round(number * factor) / factor;
    }
  }, {
    key: 'handleVolumeChange',
    value: function handleVolumeChange(value) {
      this.gainNode.gain.value = this.precisionRound(1 + value / 100, 1);
      this.setState({ 'volume': value });
    }

    /*
    handleSegmentChange(ev, type) {
      let startTime = 0, endTime = 0;
      let startInput = document.getElementById('start_pos');
        if (this.state.segment) {
        let segment = this.instance.segments.getSegment(1);
        if (type === 'start') {
          startTime =
        }
        this.instance.segments.removeAll();
      }
      this.instance.player.getCurrentTime()+5
      this.instance.segments.add({
        'startTime': startTime,
        'endTime': endTime,
        'editable': true,
        'color': '#007bff',
        'labelText': 'Audio segment to download',
        'id': 1
      });
    }
    */

  }, {
    key: 'render',
    value: function render() {
      var _this4 = this;

      return React.createElement(
        'div',
        null,
        React.createElement(
          'div',
          { className: "row justify-content-md-center mt-1" },
          React.createElement(
            'div',
            { className: "col" },
            React.createElement(
              'div',
              { className: "row" },
              this.state.playing && React.createElement(
                'button',
                { type: "button", onClick: this.handlePlayButtonClick, className: "btn btn-primary mr-3" },
                React.createElement('i', { className: "fas fa-pause" }),
                '  Pause'
              ),
              !this.state.playing && React.createElement(
                'button',
                { type: "button", onClick: this.handlePlayButtonClick, className: "btn btn-primary mr-3" },
                React.createElement('i', { className: "fas fa-play" }),
                '  Play'
              ),
              this.state.segment && React.createElement(
                'button',
                { type: "button", onClick: this.handleSegment, className: "btn btn-primary" },
                React.createElement('i', { className: "fas fa-minus" }),
                '  Remove Segment'
              ),
              !this.state.segment && React.createElement(
                'button',
                { type: "button", onClick: this.handleSegment, className: "btn btn-primary" },
                React.createElement('i', { className: "fas fa-plus" }),
                '  Insert Segment'
              )
            )
          ),
          React.createElement(
            'div',
            { className: "col" },
            React.createElement(Slider, { min: -100, max: 200, value: this.state.volume, onChange: this.handleVolumeChange, format: function format(value) {
                return value + '%';
              } })
          ),
          false && React.createElement(
            'div',
            { className: "col" },
            React.createElement(
              'div',
              { className: "input-group" },
              React.createElement(
                'div',
                { className: "input-group-prepend" },
                React.createElement(
                  'span',
                  { className: "input-group-text" },
                  'Start'
                )
              ),
              React.createElement('input', { type: "text", className: "form-control", id: "start_pos", onChange: function onChange(ev) {
                  _this4.handleSegmentChange(ev, 'start');
                } }),
              React.createElement('input', { type: "text", className: "form-control", id: "end_pos", onChange: function onChange(ev) {
                  _this4.handleSegmentChange(ev, 'end');
                } }),
              React.createElement(
                'div',
                { className: "input-group-append" },
                React.createElement(
                  'span',
                  { className: "input-group-text" },
                  'End'
                )
              )
            )
          ),
          React.createElement(
            'div',
            { className: "col" },
            React.createElement(
              'button',
              { type: "button", onClick: !this.state.downloading ? this.handleDownload : null, className: "btn btn-primary", disabled: this.state.downloading },
              React.createElement('i', { className: "fas fa-download" }),
              this.state.downloading ? "  Downloading..." : this.state.segment ? "  Download Segment" : "  Download Whole Audio"
            )
          )
        ),
        React.createElement('div', { className: "row", id: "notifications" })
      );
    }
  }]);

  return PeaksComponent;
}(React.Component);

var DownloadingNotification = function (_React$Component3) {
  _inherits(DownloadingNotification, _React$Component3);

  function DownloadingNotification(props) {
    _classCallCheck(this, DownloadingNotification);

    return _possibleConstructorReturn(this, (DownloadingNotification.__proto__ || Object.getPrototypeOf(DownloadingNotification)).call(this, props));
  }

  _createClass(DownloadingNotification, [{
    key: 'render',
    value: function render() {
      return React.createElement(
        'div',
        { className: 'alert alert-danger alert-dismissible fade show', role: 'alert' },
        this.props.message,
        React.createElement(
          'button',
          { type: 'button', className: 'close', onClick: function onClick(ev) {
              ReactDOM.unmountComponentAtNode(document.getElementById('notifications'));
            }, 'aria-label': 'Close', id: "noConnection" },
          React.createElement(
            'span',
            { 'aria-hidden': 'true' },
            '\xD7'
          )
        )
      );
    }
  }]);

  return DownloadingNotification;
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

function renderStartPage() {
  ReactDOM.render(React.createElement(
    JumbotronComponent,
    { title: "Intromaker", leadText: "Welcome to intromaker" },
    React.createElement(PickAudioComponent, { subText: "Drag and drop a link to type into the box below" })
  ), document.getElementById('container'));
}

function init() {
  renderStartPage();
}

document.addEventListener('DOMContentLoaded', init, false);
//# sourceMappingURL=intromaker.js.map