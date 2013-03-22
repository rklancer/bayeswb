/*global d3, robotModel:true*/

robotModel = function(maxSpeed, axleTrack) {
  var N = 100,
      x = new Float32Array(N),
      y = new Float32Array(N),
      heading = new Float32Array(N),

      maxV = 0.005,
      maxOmega = 0.1,

      // motion sampler parameters

      // dependence of V on V
      alpha1 = Math.pow(0.0005/maxV, 2),

      // dependence of V on omega
      alpha2 = Math.pow(0.0005/maxOmega, 2),

      // dependence of omega on V
      alpha3 = Math.pow(0.005/maxV, 2),

      // dependence of omega on omega
      alpha4 = Math.pow(0.005/maxOmega, 2),

      // dependence of gamma (additional rotational velocity applied to heading but not x, y) on V
      alpha5 = 0.5 * alpha3,

      // dependence of gamma on omega
      alpha6 = 0.5 * alpha4;


  function getVelocities(left, right, callback) {
    // Radius and angle of arc follows from differential drive geometry
    // Here we assume the center point of the arc is to the left of the robot when driving forward
    // (counterclockwise)

    var sum = right + left,
        diff = right - left;

    callback(sum * maxSpeed / 2, diff * maxSpeed  / axleTrack);
  }

  function updatePose(x, y, heading, v, omega, gamma, dt, i, callback) {
    var dHeading = omega * dt,
        radius;

    if (omega === 0) {
      x += v * Math.cos(heading);
      y += v * Math.sin(heading);
    } else {
      radius = v / omega;
      x += radius * (Math.sin(heading + dHeading) - Math.sin(heading));
      y += radius * (Math.cos(heading) - Math.cos(heading + dHeading));
    }

    heading += (dHeading + gamma * dt);
    callback(x, y, heading, i);
  }

  function updateSample(_x, _y, _heading, i) {
    x[i] = _x;
    y[i] = _y;
    heading[i] = _heading;
  }

  function getSamples() {
    return {
      x: x,
      y: y,
      heading: heading
    };
  }

  // Generate N samples of motion using velocity-model sampler
  // See Thrun, Burgard and Fox, Probabilistic Robotics, Chapter 5.
  function updateMotionModelSamples(xInitial, yInitial, theta, v, omega, dt) {
    var vSq = v*v,
        omegaSq = omega*omega,

        vSampler = d3.random.normal(v, Math.sqrt(alpha1*vSq + alpha2*omegaSq)),
        omegaSampler = d3.random.normal(omega, Math.sqrt(alpha3*vSq + alpha4*omegaSq)),
        gammaSampler = d3.random.normal(0, Math.sqrt(alpha5*vSq + alpha6*omegaSq)),

        i;

    for (i = 0; i < N; i++) {
      updatePose(xInitial, yInitial, theta, vSampler(), omegaSampler(), gammaSampler(), dt, i, updateSample);
    }

    return this.getSamples();
  }

  return {
    getVelocities: getVelocities,
    updatePose: updatePose,
    getSamples: getSamples,
    updateMotionModelSamples: updateMotionModelSamples
  };

};