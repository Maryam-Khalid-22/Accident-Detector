import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import EmergencyApp from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <EmergencyApp />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
// Remove or comment out if you deleted reportWebVitals.js
// import reportWebVitals from './reportWebVitals';
// reportWebVitals();