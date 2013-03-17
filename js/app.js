/*global d3, $, touchjoy */
var dt = 1,
    maxSpeed = 0.01,
    axleTrack = 0.1,
    poseTrailLength = 15,
    turtleColor = 'rgb(51, 181, 229)',
    headingColor = 'red',

    // distance moved in 1 time step, relative to track
    characteristicLength = (maxSpeed * dt / axleTrack),

    pose = { x: 0, y: 0, heading: Math.PI/2 },
    poseTrailData = [],
    nPoses = 0,
    updateTurtle,
    formatter = d3.format('1.2f');


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

  if (nPoses % 5 > 0) {
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
        .range([0.7, 0.1]);

  if (width > height) {
    x.domain([-width/height, width/height]);
    y.domain([-1, 1]);
    l.range([0, height]);
  } else {
    x.domain([-1, 1]);
    y.domain([-height/width, height/width]);
    l.range([0, width]);
  }

  updateTurtle = function(pose) {
    pushToPoseTrail(pose);

    var selection = svg.selectAll('g.turtle').data(poseTrailData),
        enteringGroup = selection.enter().append('g');

    enteringGroup
      .attr('class', 'turtle')
      .attr('stroke', turtleColor)
      .append('circle')
        .attr('class', 'body')
        .attr('r', l(axleTrack/2))
        .attr('fill-opacity', 0)
        .attr('cx', 0)
        .attr('cy', 0);

    enteringGroup
      .append('path')
        .attr('class', 'headingIndicator')
        .attr('stroke', headingColor)
        .attr('d', 'm' + l(axleTrack/4) + ' 0 l' + l(axleTrack/4) + ' 0');

    [-l(axleTrack/2), l(axleTrack/2)].forEach(function(y) {
      enteringGroup
        .append('rect')
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

    selection
      .attr('transform', function(d) {
        return 'translate(' + x(d.x) + ',' + y(d.y) + ') rotate(' + degrees(-d.heading) + ')';
      })
      .filter(function(d) {
        return d !== pose;
      }).attr('stroke-opacity', function(d, i) {
        return poseTrailOpacity(poseTrailData.length - 2 - i);
      }).selectAll('.turtle .wheel, .turtle .body').remove();

    selection.exit().remove();
  };

  updateTurtle(pose);
}


function setupPositionHeatmap() {
  var card = $('#heatmap'),
      header = card.find('h1'),

      width = card.outerWidth(),
      top = header.offset().top - card.offset().top + header.outerHeight(true),
      height = card.outerHeight() - top,

      svg = d3.select('#heatmap').append('svg')
       .style('position', 'absolute')
       .style('left', 0)
       .style('width', width)
       .style('top', top)
       .style('height', height),

      heatmap = svg.append('g');
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
      diff = right - left,
      translationalVelocity,
      rotationalVelocity;

  if (diff === 0) {
    translationalVelocity = maxSpeed;
    rotationalVelocity = 0;
  } else {
    translationalVelocity = sum * maxSpeed / 2;
    rotationalVelocity = diff * maxSpeed  / axleTrack;
  }

  callback(translationalVelocity, rotationalVelocity);
}

function poseDelta(translationalVelocity, rotationalVelocity, dt, callback) {
  var arcRadius,
      arcAngle,
      dx,
      dy,
      r;

  arcAngle = rotationalVelocity * dt;
  if (rotationalVelocity === 0) {
    dx = translationalVelocity * dt;
    dy = 0;
  } else {
    arcRadius = translationalVelocity / rotationalVelocity;
    dx = arcRadius * (Math.cos(arcAngle) - 1);
    dy = arcRadius * Math.sin(arcAngle);
  }

  r = Math.sqrt(dx*dx + dy*dy);

  if (arcAngle*arcRadius < 0) r *= -1;

  callback(r, arcAngle);
}

$(document).ready(function() {
  setupTurtle();
  setupPositionHeatmap();

  touchjoy(100, function(x, y) {
    motorInputs(x, y, function(left, right) {

      velocities(left, right, function (translationalVelocity, rotationalVelocity) {
        poseDelta(translationalVelocity, rotationalVelocity, dt, function (r, theta) {
          var x = pose.x,
              y = pose.y,
              heading = pose.heading;

          pose = {
            x: x + r * Math.cos(heading + theta/2),
            y: y + r * Math.sin(heading + theta/2),
            heading: normalizeAngle(heading + theta)
          };
          updateTurtle(pose);
        });
      });
    });
  });
});
