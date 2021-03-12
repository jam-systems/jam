let timeout = null;
export default function log(...args) {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    console.log('\n----------------\n\n');
  }, 20);
  console.log(...args);
}
