/*global normal: true, d3, console, performance*/
/*jshint eqnull: true */

// Simple (Box-Muller) univariate-normal random number generator.
//
// D3 library includes a Box-Muller implementation which is likely to be slower, especially in a
// modern Javascript engine, because it uses a rejection method to pick the random point in the unit
// circle. See discussion on pp. 1-3 of:
// http://www.math.nyu.edu/faculty/goodman/teaching/MonteCarlo2005/notes/GaussianSampling.pdf

normal = (function() {
  var next = null;

  return function(mean, sd) {
    if (mean == null) mean = 0;
    if (sd == null)   sd = 1;

    var r, ret, theta, u1, u2;

    if (next) {
      ret  = next;
      next = null;
      return ret;
    }

    u1    = Math.random();
    u2    = Math.random();
    theta = 2 * Math.PI * u1;
    r     = Math.sqrt(-2 * Math.log(u2));

    next = mean + sd * (r * Math.sin(theta));
    return mean + sd * (r * Math.cos(theta));
  };
}());

function benchNormal(n) {
  var i,
      s1 = 0,
      s2 = 0,
      d3normal = d3.random.normal(),
      ournormal = normal,
      start,
      d3time,
      ourtime,
      now;

  if (false && typeof performance !== 'undefined' && performance.now) {
    now = function() { return performance.now(); };
  } else {
    now = function() { return Date.now(); };
  }

  // burn in
  for (i = 0; i < 1e4; i++) {
    s1 += d3normal();
    s2 += ournormal();
  }

  start = now();
  for (i = 0; i < n; i++) {
    s1 += d3normal();
  }
  d3time = now() - start;

  start = now();
  for (i = 0; i < n; i++) {
    s2 += ournormal();
  }
  ourtime = now() - start;

  console.log("which, sum, time");
  console.log("d3, " + s1 + ", " + d3time);
  console.log("ours, " + s2 + ", " + ourtime);

}