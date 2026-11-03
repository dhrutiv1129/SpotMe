import React from 'react';
import {registerRootComponent} from 'expo';
import App from './App';
import {PhonePreview} from './src/beta/PhonePreview';

function Root() {
  return React.createElement(PhonePreview, null, React.createElement(App));
}
registerRootComponent(Root);
