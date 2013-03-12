/*global d3 console touchjoy*/

var dt = 1,
    maxSpeed = 0.01,
    axleTrack = 0.1,
    pose = { x: 0, y: 0, heading: Math.PI/2 },
    updateTurtle;

function setupTurtle() {
  var svg = d3.select('#field').append('svg')
        .attr('width', '100%')
        .attr('height', '100%'),

      width = svg.style('width'),
      height = svg.style('height'),

      x = d3.scale.linear()
        .domain([-1, 1])
        .range([0, width]),

      y = d3.scale.linear()
        .domain([-1, 1])
        .range([height, 0]),

      turtle = svg.selectAll('circle');

  updateTurtle = function(pose) {
    var selection = turtle.data([pose]);

    selection.enter().append('circle')
      .attr('r', '3px')
      .attr('fill', 'rgb(51, 181, 229)');

    selection
      .attr('cx', function (d) { return x(d.x); })
      .attr('cy', function (d) { return y(d.y); });
  };

  updateTurtle(pose);
  return turtle;
}

// Interpreted from what we did for the Artisans Asylum bot
function interpretMotorCommand(x, y, callback) {
  var angle = Math.atan2(y, x) - Math.PI/4,
      speed = Math.sqrt(x*x + y*y),
      left  = Math.sin(angle),
      right = Math.cos(angle),
      scale = speed / Math.max(Math.abs(left), Math.abs(right));

  if (speed > 1.0) {
    throw new Error("Joystick input outside the unit circle");
  }
  callback(scale * left, scale * right);
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
      r,
      theta;

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

  console.log({r: r, arcAngle: arcAngle});

  callback(r, arcAngle/2, arcAngle);
}

var turtle = setupTurtle();

touchjoy(100, function(x, y) {
  interpretMotorCommand(x, y, function(left, right) {
    move(left, right, function(r, theta, arcAngle) {
      pose.x += r * Math.cos(pose.heading + theta);
      pose.y += r * Math.sin(pose.heading + theta);
      pose.heading += arcAngle;
      updateTurtle({x: pose.x, y: pose.y});
    });
  });
});
