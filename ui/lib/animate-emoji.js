// floating emoji animation 😅
// Gregor Mitscha-Baude 2021

// physical constants
const g = -0.4e-4; // gravity (~ length scale on which emoji moves)
const G = Math.abs(g);

// time is measured in real milliseconds as returned by Date.now
const tmax = 5000; // length of animation

const Rx = 2 * G; // Brownian motion in x
const Fx = 4 * G; // friction in x
const vx0 = 0.1 * tmax * G; // start velocity in x

const Fy = 2 * G; // friction in y
const vy0 = 0.4 * tmax * G; // start velocity in y

// a = rotation angle
// TODO these numbers should be proportional to emoji size
const size = 80; // rough emoji size in px
const Ra = 1e-8 * size * 360; // Brownian motion in a
const Fa = 5e-4; // friction in a
const Sa = (5 * G) / size; // stiffness (higher <=> smaller + faster wiggles)

// Newton's equation of motion (one integration step)
function move(t, x, vx, y, vy, a, va) {
  // update time
  let dt = Date.now() - t;
  t += dt;

  // update positions based on velocities
  x += dt * vx;
  y += dt * vy;
  a += dt * va;

  // update velocities based on forces
  vx += dt * (Rx * randn() /* random fluctuation */ - Fx * vx) /* friction */;
  vy += dt * (g /* gravity */ - Fy * vy);
  va += dt * (-Sa * a /* spring */ + Ra * randn() - Fa * va);

  return [t, x, vx, y, vy, a, va];
}

function render(emojiStyle, t, t0, tend, x, y, a) {
  let timeFraction = (t - t0) / (tend - t0);

  // simple scale & opacity transforms
  let scale = 1 - 0.75 * timeFraction; // vanish at 25% original size
  let opacity = 1 - timeFraction ** 2; // only get transparent near the end
  emojiStyle.opacity = `${opacity}`;

  // apply position update
  emojiStyle.transform = `scale(${scale}) translate(${x / scale}px,${
    -y / scale
  }px) rotate(${a}deg)`;
}

export default function animateEmoji(element) {
  let emojiStyle = element.style;

  // initialize
  let t0 = Date.now();
  let tend = t0 + tmax;
  let vx00 = vx0 * randn();
  let [t, x, vx, y, vy, a, va] = [t0, 0, vx00, 0, vy0, 0, 0];

  // update on every frame until animation ends
  function step() {
    if (t > tend) return;
    [t, x, vx, y, vy, a, va] = move(t, x, vx, y, vy, a, va);
    render(emojiStyle, t, t0, tend, x, y, a);
    window.requestAnimationFrame(step);
  }

  window.requestAnimationFrame(step);
}

// helper: gaussian random variables
function randn() {
  // box-muller transform, uniform [0,1] to standard normal
  return (
    Math.sqrt(-2 * Math.log(1 - Math.random())) *
    Math.cos(2 * Math.PI * Math.random())
  );
}
