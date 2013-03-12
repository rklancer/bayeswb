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

function move(left, right) {
  console.log(left, right);
}

touchjoy(100, function(x, y) {
  interpretMotorCommand(x, y, move);
});
