/*global d3, robotModel:true*/

robotModel = function() {
  var N = 100,
      x = new Float32Array(N),
      y = new Float32Array(N),
      heading = new Float32Array(N),

      maxV = 0.01,
      maxOmega = 0.2,

      // motion sampler parameters
      alpha1 = Math.pow(0.002/maxV, 2),
      alpha2 = Math.pow(0.001/maxOmega, 2),
      alpha3 = Math.pow(0.2/maxV, 2),
      alpha4 = Math.pow(1/maxOmega, 2),
      alpha5 = alpha3,
      alpha6 = alpha4;

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
    updatePose: updatePose,
    getSamples: getSamples,
    updateMotionModelSamples: updateMotionModelSamples
  };

};