import React from 'react';
import {currentId} from '../logic/identity';
import Container from './Container';

export default function Me() {
  return (
    <Container style={{height: 'initial', minHeight: '100%'}}>
      <div className="p-6 md:p-10">

        <h1>Your Identity</h1>

        <p>
          Your id is: {currentId()}
        </p>

        <hr className="mt-14 mb-14" />


      </div>
    </Container>
  );
}
