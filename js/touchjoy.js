/*global $ console: true touchjoy: true */

touchjoy = function(intervalLength, callback) {
  var x = 0,
      y = 0,
      intervalID;

  intervalLength = intervalLength || 200;

  // define console as a noop if not defined
  if (typeof console === 'undefined') console = { log: function() {} };

  function sendJoystickPosition() {
    callback(x, y);
  }

  function startSending() {
    intervalID = setInterval(sendJoystickPosition, intervalLength);
  }

  function stopSending() {
    // one last time
    if (intervalID) sendJoystickPosition();
    clearInterval(intervalID);
    intervalID = null;
  }

  // draws "joystick", updates x and y
  function joystickGo() {

    // Just do the dead simplest thing right now -- we have one draggable element, and no encapsulation

    var dragInfo = {},
        centerX,
        centerY,
        radialLimit,
        radialLimitSquared;

    function updatePosition(_x, _y) {
      x = _x / radialLimit;
      y = - _y / radialLimit;
    }

    function centerKnob() {
      var $el = $(dragInfo.element),
          width = $('#joystick .background').width();

      $el.animate({
        left: width/2,
        top: width/2
      }, 200);
      updatePosition(0, 0);
    }

    function dragStart(evt) {
      dragInfo.dragging = true;
      evt.preventDefault();

      var $el = $(dragInfo.element),
          offset = $el.offset(),
          width = $el.width(),
          cx = offset.left + width/2 - centerX,
          cy = offset.top + width/2 - centerY;

      dragInfo.dx = evt.pageX - cx;
      dragInfo.dy = evt.pageY - cy;
      startSending();
    }

    function drag(evt) {
      if ( ! dragInfo.dragging ) return;
      evt.preventDefault();

      var $el = $(dragInfo.element),
          offset = $el.offset(),
          width = $el.width(),

          // find the current center of the element
          cx = offset.left + width/2 - centerX,
          cy = offset.top + width/2 - centerY,
          newcx = evt.pageX - dragInfo.dx,
          newcy = evt.pageY - dragInfo.dy,
          newRadiusSquared = newcx*newcx + newcy*newcy,
          scale;

      if (newRadiusSquared > radialLimitSquared) {
        scale = Math.sqrt( radialLimitSquared / newRadiusSquared );
        newcx *= scale;
        newcy *= scale;
      }

      updatePosition(newcx, newcy);

      offset.left += (newcx - cx);
      offset.top += (newcy - cy);

      $(dragInfo.element).offset(offset);
    }

    function dragEnd() {
      dragInfo.dragging = false;
      centerKnob();
      stopSending();
    }

    function adjustDimensions() {
      var $background = $('#joystick .background'),
          $knob = $('#joystick .knob'),
          offset = $background.offset(),
          width = $background.width();

      makeCircular($background);
      makeCircular($knob);

      centerX = width/2 + offset.left;
      centerY = width/2 + offset.top;
      radialLimit = (width - $knob.width()) / 2;
      radialLimitSquared = radialLimit * radialLimit;
    }

    function makeCircular($el) {
      var width = $el.width();
      // Android 2 browser doesn't seem to understand percentage border-radius, so we need to set it
      // via an inline style once we know the width
      $el.css({
        height: width,
        borderRadius: width/2
      });
    }

    function wrapForTouch(f) {
      return function(evt) {
        if (evt.originalEvent && evt.originalEvent.touches && evt.originalEvent.touches.length === 1) {
          evt.pageX = evt.originalEvent.touches[0].pageX;
          evt.pageY = evt.originalEvent.touches[0].pageY;
        }
        return f(evt);
      };
    }

    $(function() {
      var $background = $('#joystick .background'),
          $knob = $('#joystick .knob');

      adjustDimensions();
      dragInfo.element = $knob[0];

      $knob.bind('touchstart mousedown', wrapForTouch(dragStart));
      $(document).bind('touchmove mousemove', wrapForTouch(drag));
      $(document).bind('touchend mouseup', wrapForTouch(dragEnd));

      $background.bind('mousedown', function() { return false; });
    });

  }

  // and...go:

  joystickGo();

};
