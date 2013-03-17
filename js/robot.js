/*global d3, robotModel:true*/

robotModel = function() {
  var N = 1,
      x = new Float32Array(N),
      y = new Float32Array(N),
      heading = new Float32Array(N),

      // motion sampler parameters
      alpha1 = 0,
      alpha2 = 0,
      alpha3 = 0,
      alpha4 = 0,
      alpha5 = 0,
      alpha6 = 0;

  function updatePose(xInitial, yInitial, theta, v, omega, gamma, dt, i, callback) {
    var x,
        y,
        heading,
        radius,
        dTheta;

    if (omega === 0) {
      x = xInitial + v * dt;
      y = yInitial + v * dt;
      heading = theta + gamma * dt;
    } else {
      radius = v/omega;
      dTheta = omega * dt;

      x = xInitial + radius * (Math.sin(theta + dTheta) - Math.sin(theta));
      y = yInitial + radius * (Math.cos(theta) - Math.cos(theta + dTheta));
      heading = theta + dTheta + gamma * dt;
    }
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
  function updateMotionModelSamples(v, omega, xInitial, yInitial, theta, dt) {
    var vSq = v*v,
        omagaSq = omega*omega,

        vSampler = d3.random.normal(v, Math.sqrt(alpha1*vSq + alpha2*omagaSq)),
        omegaSampler = d3.random.normal(omega, Math.sqrt(alpha3*vSq + alpha4*omagaSq)),
        gammaSampler = d3.random.normal(0, Math.sqrt(alpha5*vSq + alpha6*omagaSq)),

        i;

    for (i = 0; i < N; i++) {
      updatePose(xInitial, yInitial, theta, vSampler(), omegaSampler(), gammaSampler(), dt, i, updateSample);
    }

    return this.getSamples();
  }

  return {
    updatePose: updatePose,
    getSamples: getSamples,
    updateMotionModelSamples: updateMotionModelSamples
  };

};