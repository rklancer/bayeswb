/*global d3 console touchjoy $*/

var dt = 1,
    maxSpeed = 0.015,
    axleTrack = 0.03,
    poseTrailLength = 10,
    turtleColor = 'rgb(51, 181, 229)',

    // distance moved in 1 time step, relative to track
    characteristicLength = (maxSpeed * dt / axleTrack),

    pose = { x: 0, y: 0, heading: Math.PI/2 },
    poseTrailData = [],
    nPoses = 0,
    updateTurtle,
    formatter = d3.format('1.2f');


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

      width = $(svg.node()).width(),
      height = $(svg.node()).height(),
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

    var selection = svg.selectAll('g.turtle').data(poseTrailData);

    selection.enter().append('g')
      .attr('class', 'turtle')
      .append('circle')
        .attr('r', l(axleTrack))
        .attr('stroke', turtleColor)
        .attr('fill-opacity', 0)
        .attr('cx', 0)
        .attr('cy', 0);

    selection
      .attr('transform', function(d) {
        return 'translate(' + x(d.x) + ',' + y(d.y) + ')';
      })
      .select('circle')
        .attr('stroke-opacity', function(d, i) {
          if (i === poseTrailData.length - 1) return 1;
          return poseTrailOpacity(poseTrailData.length - 2 - i);
        });

    selection.exit().remove();
  };

  updateTurtle(pose);
}

// Interpreted from what we did for the Artisans Asylum bot
function interpretMotorCommand(x, y, callback) {

  // f(x) can be any function that map the slope y/x of first-quadrant joystick position (x, y) to
  // the resulting radius of the arc that will be traveled by the robot (in units of half the
  // distance between the wheels, or "track": i.e., f(y/x) = 1 -> radius = axleTrack/2)
  //
  // Range [0, Infinity] -> Domain [0, Infinity]
  function f(x) {
    return 10*x*x;
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

function move(left, right, callback) {
  // Radius and angle of arc follows from differential drive geometry
  // Here we assume the center point of the arc is to the left of the robot when driving forward
  // (counterclockwise)

  var sum = right + left,
      diff = right - left,
      arcRadius,
      arcAngle,
      dx,
      dy,
      r;

  if (diff === 0) {
    arcAngle = 0;
    dx = maxSpeed * (sum / 2);
    dy = 0;
  }

  if (diff !== 0) {
    arcAngle = diff * maxSpeed * dt / axleTrack;
    arcRadius = (sum / diff) * 0.5 * axleTrack;
    dx = arcRadius * (Math.cos(arcAngle) - 1);
    dy = arcRadius * Math.sin(arcAngle);
  }

  r = Math.sqrt(dx*dx + dy*dy);

  if (arcAngle*arcRadius < 0) r *= -1;

  callback(r, arcAngle);
}

setupTurtle();

touchjoy(100, function(x, y) {
  interpretMotorCommand(x, y, function(left, right) {
    $('.left-display').text(formatter(left));
    $('.right-display').text(formatter(right));

    move(left, right, function(r, arcAngle) {
      var x = pose.x,
          y = pose.y,
          heading = pose.heading;

      pose = {
        x: x + r * Math.cos(heading + arcAngle/2),
        y: y + r * Math.sin(heading + arcAngle/2),
        heading: heading + arcAngle
      };
      updateTurtle(pose);
    });
  });
});
