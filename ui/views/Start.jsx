import React from 'react';

export default function Start() {
  var randomId = Math.random().toString(36).substr(2, 6);
  var roomHref = "/" + randomId;
  return (
    <div className="container">
      <div className="child">
        <h1>Welcome to Jam</h1>
        <p>
          <img alt="Jam Logo" src="/img/jam-logo.jpg" />
        </p>
        <form action={roomHref} method="post">
          <button href={roomHref}>🌱 Create a new room</button>
        </form>
      </div>
    </div>
  );
}
