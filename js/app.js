/*global d3, $, touchjoy, robotModel */
var dt = 1,
    maxSpeed = 0.005,
    axleTrack = 0.1,
    poseTrailLength = 15,
    blueThemeColor = 'rgb(51, 181, 229)',
    purpleAccentColor = 'rgb(170, 102, 204)',
    redAccentColor = 'rgb(255, 68, 58)',

    turtleColor = blueThemeColor,
    headingColor = redAccentColor,

    // distance moved in 1 time step, relative to track
    characteristicLength = (maxSpeed * dt / axleTrack),

    pose = { x: 0, y: 0, heading: Math.PI/2 },
    poseTrailData = [],
    nPoses = 0,
    updateTurtle,
    updateMotionModelDisplay,
    formatter1f = d3.format('.1f'),
    formatter2f = d3.format('1.2f'),
    motionCards = [],
    nMotionCards = 0;

function degrees(rad) {
  return rad/Math.PI * 180;
}

function normalizeAngle(angle) {
  angle = angle % (2 * Math.PI);
  if (angle < -Math.PI) {
    angle += (2 * Math.PI);
  } else if (angle > Math.PI) {
    angle -= (2 * Math.PI);
  }
  return angle;
}

function pushToPoseTrail(pose) {
  if (nPoses === 0) poseTrailData.push(pose);

  if (nPoses % 20 > 0) {
    poseTrailData.pop();
  }
  if (poseTrailData.length > poseTrailLength) {
    poseTrailData.shift();
  }
  poseTrailData.push(pose);
  nPoses++;
}

function setupTurtle() {
  var svg = d3.select('#field').append('svg')
        .attr('width', '100%')
        .attr('height', '100%'),

      width = $('#field').width(),
      height = $('#field').height(),
      y = d3.scale.linear()
            .range([height, 0]),
      x = d3.scale.linear()
            .range([0, width]),
      l = d3.scale.linear()
            .domain([0,2]),
      poseTrailOpacity = d3.scale.linear()
        .domain([0, poseTrailLength-1])
        .range([0.7, 0.1]),

      turtle;

  if (width > height) {
    x.domain([-width/height, width/height]);
    y.domain([-1, 1]);
    l.range([0, height]);
  } else {
    x.domain([-1, 1]);
    y.domain([-height/width, height/width]);
    l.range([0, width]);
  }

  turtle = svg.append('g')
                .attr('class', 'turtle')
                .attr('stroke', turtleColor);

  turtle.append('circle')
          .attr('class', 'body')
          .attr('r', l(axleTrack/2))
          .attr('fill-opacity', 0)
          .attr('cx', 0)
          .attr('cy', 0);

  [-l(axleTrack/2), l(axleTrack/2)].forEach(function(y) {
    turtle.append('rect')
            .attr('class', 'wheel')
            .attr('height', l(axleTrack/10))
            .attr('width', l(axleTrack/4))
            .attr('fill-opacity', 1)
            .attr('fill', turtleColor)
            .attr('rx', l(axleTrack/40))
            .attr('ry', l(axleTrack/40))
            .attr('x', -l(axleTrack/8))
            .attr('y', y - l(axleTrack/20));
  });

  function setTransform (selection) {
    selection.attr('transform', function(d) {
      return 'translate(' + x(d.x) + ',' + y(d.y) + ') rotate(' + degrees(-d.heading) + ')';
    });
  }

  updateTurtle = function(pose) {
    pushToPoseTrail(pose);

    var poseTrail = svg.selectAll('path.headingIndicator').data(poseTrailData);

    poseTrail.enter()
      .append('path')
        .attr('class', 'headingIndicator')
        .attr('stroke', headingColor)
        .attr('d', 'm' + l(axleTrack/4) + ' 0 l' + l(axleTrack/4) + ' 0');

    poseTrail.call(setTransform)
      .filter(function(d) {
        return d !== pose;
      }).attr('stroke-opacity', function(d, i) {
        return poseTrailOpacity(poseTrailData.length - 2 - i);
      });

    poseTrail.exit().remove();

    turtle.data([pose]).call(setTransform);
  };

  updateTurtle(pose);
}

function setupMotionModelDisplay() {
  var card = $('#motion-model-display'),
      header = card.find('h1'),

      width = card.outerWidth(),
      top = header.offset().top - card.offset().top + header.outerHeight(true),
      height = card.outerHeight() - top,

      svg = d3.select('#motion-model-display').append('svg')
       .style('position', 'absolute')
       .style('left', 0)
       .attr('width', width)
       .style('top', top)
       .attr('height', height),

      scale = d3.scale.linear()
        .domain([-1.5 * maxSpeed * dt, 1.5 * maxSpeed * dt])
        .range([0, width]),

      // PERFORMANCE NOTE
      // The "obvious" thing to do here is apply a translation to motionModelDisplay, instead of to each
      // circle. However, the combination of a translation on g.motionModelDisplay + a rotation on each
      // circle.sample slows down Firefox badly. See reverted commit 8d14c753. Either transform
      // without the other is ok, and applying the both transforms to the individual circle.samples
      // (as we do here) is ok.

      motionModelDisplay = svg.append('g')
        .attr('class', 'motion-model-display'),

      samplesLayer = motionModelDisplay.append('g').attr('class', 'samples'),

      cx = scale(0),
      cy = scale(0),

      centerCircle = motionModelDisplay.append('circle')
        .attr('class', 'center')
        .attr('fill', redAccentColor)
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', '3px'),

      centerTick = motionModelDisplay.append('line')
        .attr('class', 'center')
        .attr('stroke', redAccentColor)
        .attr('stroke-opacity', 1)
        .attr('stroke-width', '2px')
        .attr('x1', scale(1.3 * maxSpeed * dt))
        .attr('y1', cy)
        .attr('x2', scale(1.5 * maxSpeed * dt))
        .attr('y2', cy)
        .attr('transform', function (d) {
          return 'rotate(-90 ' + cx + ' ' + cy + ')';
        });


  updateMotionModelDisplay = function(xs, ys, headings, xRef, yRef, headingRef, dt) {
    headingRef = degrees(headingRef) - 90;

    var points = samplesLayer.selectAll('circle.sample').data(xs),
        ticks = samplesLayer.selectAll('line.sample').data(headings);

    scale.domain([-1.5 * maxSpeed * dt, 1.5 * maxSpeed * dt]);

    points.enter().append('circle')
      .attr('class', 'sample')
      .attr('fill', blueThemeColor)
      .attr('fill-opacity', 0.5)
      .attr('r', '1px');

    points
      .attr('transform', function (d, i) {
        return 'rotate(' + headingRef + ' ' + cx + ' ' + cy + ') translate(' + scale(xs[i] - xRef) + ', ' + scale(yRef - ys[i]) +')';
      });

    ticks.enter().append('line')
      .attr('class', 'sample')
      .attr('stroke', purpleAccentColor)
      .attr('stroke-opacity', 0.2)
      .attr('stroke-width', '1px')
      .attr('x1', scale(1.35 * maxSpeed * dt))
      .attr('y1', cy)
      .attr('x2', scale(1.45 * maxSpeed * dt))
      .attr('y2', cy);

    ticks
      .attr('transform', function (d) {
        return 'rotate(' + (headingRef - degrees(d)) + ' ' + cx + ' ' + cy + ')';
      });
  };
}

function addMotionCard(v, omega) {
  var emsize = parseInt($('body').css('font-size'), 10),

      card = $('<div class="card"><span class="display translational-velocity"></span><span class="display angular-velocity"></span></div>')
        .appendTo('#data-cards'),

      height = card.outerHeight(),
      width = card.outerWidth(),
      x = d3.scale.linear()
        .domain([0, 1])
        .range([0, width]),
      y = d3.scale.linear()
        .domain([0, 1])
        .range([height, 0]),
      svg = d3.select(card[0]).append('svg')
        .style('position', 'absolute')
        .style('left', 0)
        .attr('width', width)
        .style('top', 0)
        .attr('height', height),

      spacePerCard = 4.5 * emsize,
      sign = v > 0 ? 1 : -1,
      omegaSign = omega > 0 ? 1 : -1;

  card.find('.display.translational-velocity')
    .html(formatter2f(v/maxSpeed))
    .css('color', blueThemeColor);
  card.find('.display.angular-velocity')
    .html(formatter1f(degrees(omega)) +"&deg;").css('color', purpleAccentColor);

  v = Math.abs(v);
  omega = Math.abs(omega);

  card.css('left', spacePerCard * (nMotionCards++));

  if (card.offset().left + width > $('body').width()) {
    $('#data-cards').css('left', parseInt($('#data-cards').css('left'), 10) - spacePerCard);
    motionCards.shift();
    $('#data-cards .card').first().remove();
  }

  // TODO pull into 'arrow' path generator
  var // width of arrow shaft
      a = 0.07,
      // total height of arrow, bottom to tip
      b = 0.45,
      // extra width of arrow head (on either side)
      c = 0.04,
      // length of arrow head
      d = 0.15,

      // inner diameter of arc
      id = 0.7,

      // exaggeration of omega (amount to multiply by to get angle of arc display)
      exaggeration = 3;

  // ~degrees of arc taken up by full-length arrowhead
  var thetaArrow = d / (id + a/2),
      arcAngle = Math.max(0, exaggeration * omega - thetaArrow);

  svg.append('path')
    .attr('d', 'M' + x(0) + ' ' + y(0) + ' ' +
               'L' + x(0) + ' ' + y(Math.max(0, b * v/maxSpeed - d)) + ' ' +
               'L' + x(-c) + ' ' + y(Math.max(0, b * v/maxSpeed - d)) + ' ' +
               'L' + x(a/2) + ' ' + y(b * v/maxSpeed) + ' ' +
               'L' + x(a+c) + ' ' + y(Math.max(0, b * v/maxSpeed - d)) + ' ' +
               'L' + x(a) + ' ' + y(Math.max(0, b * v/maxSpeed - d)) + ' ' +
               'L' + x(a) + ' ' + y(0) +'z')
    .attr('fill', blueThemeColor)
    .attr('transform', 'translate(' + x(0.10) + ' ' + ((-b-0.05) * height) + ') ' +
                       'rotate(' + (sign * 90 - 90) + ' ' + x(a/2) + ' ' + height +')');

  var arcPath = d3.svg.arc()({
        startAngle: 0,
        endAngle: arcAngle,
        innerRadius: x(id),
        outerRadius: x(id + a)
      }),
      arc = svg.append('g');

  arc.append('path')
    .attr('d', arcPath)
    .attr('fill', purpleAccentColor)
    .attr('transform', 'translate(' + x(0.5) + ' ' + height + ')');

  arc.append('path')
     .attr('d', 'M' + x(-a/2) + ' ' + y(0) + ' ' +
               'L' + x(-c-a/2) + ' ' + y(0) + ' ' +
               'L' + x(0) + ' ' + y(Math.min(exaggeration*omega*(id+a/2), d)) + ' ' +
               'L' + x(a/2+c) + ' ' + y(0) + ' ')
    .attr('fill', purpleAccentColor)
    .attr('transform',
                       'translate(' + x(0.5 + (id + a/2)*Math.sin(arcAngle)) + ' ' + (-y(1 - (id + a/2)*Math.cos(arcAngle))) + ')' +
                       'rotate(' + (90 + degrees(exaggeration * omega)) + ' ' + x(0) + ' ' + y(0) +   ')');

  if (omegaSign > 0) {
    arc.attr('transform', 'translate(' + x(1) + ' 0)' +
                          'scale(-1 1)');
  }

  motionCards.push(svg);
}

// Updated from what we did for the Artisans Asylum bot
function motorInputs(x, y, callback) {

  // f(x) can be any function that map the slope y/x of first-quadrant joystick position (x, y) to
  // the resulting radius of the arc that will be traveled by the robot (in units of half the
  // distance between the wheels, or "track": i.e., f(y/x) = 1 -> radius = axleTrack/2)
  //
  // Range [0, Infinity] -> Domain [0, Infinity]
  function f(x) {
    return 5*x*x;
  }

  var speed = Math.sqrt(x*x + y*y),
      mirrorRight = x*y < 0,
      mirrorTop = y < 0,
      left,
      right,
      radius,
      tmp;

  x = Math.abs(x);
  y = Math.abs(y);

  if (x === 0) {
    right = left = speed;
  } else {
    radius = f(y/x);
    left = speed;
    right = left * (radius-1)/(radius+1);
  }

  if (mirrorRight) {
    tmp = right;
    right = left;
    left = tmp;
  }

  if (mirrorTop) {
    left = -left;
    right = -right;
  }

  callback(left, right);
}

function velocities(left, right, callback) {
  // Radius and angle of arc follows from differential drive geometry
  // Here we assume the center point of the arc is to the left of the robot when driving forward
  // (counterclockwise)

  var sum = right + left,
      diff = right - left;

  callback(sum * maxSpeed / 2, diff * maxSpeed  / axleTrack);
}


$(document).ready(function() {
  var model = robotModel(),
      animationSteps = 0,
      v = 0,
      omega = 0;

  setupTurtle();
  setupMotionModelDisplay();

  d3.timer(function() {
    animationSteps++;
    model.updatePose(pose.x, pose.y, pose.heading, v, omega, 0, dt, 0, function(x, y, heading) {
      pose = {
        x: x,
        y: y,
        heading: normalizeAngle(heading)
      };
      updateTurtle(pose);
    });
  });

  touchjoy(250, function(x, y) {
    motorInputs(x, y, function(left, right) {
      velocities(left, right, function (_v, _omega) {
        v = _v;
        omega = _omega;

        addMotionCard(v, omega);
        var samples = model.updateMotionModelSamples(pose.x, pose.y, pose.heading, v, omega, animationSteps * dt);
        updateMotionModelDisplay(samples.x, samples.y, samples.heading, pose.x, pose.y, pose.heading, animationSteps * dt);
        animationSteps = 0;
      });
    });
  });
});
