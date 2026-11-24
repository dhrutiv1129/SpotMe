import React from 'react';
import {registerRootComponent} from 'expo';
import App from './App';
import {PhonePreview} from './src/beta/PhonePreview';
import {ThemeProvider} from './src/theme';

function Root() {
  return React.createElement(ThemeProvider, null,
    React.createElement(PhonePreview, null, React.createElement(App)));
}
registerRootComponent(Root);
