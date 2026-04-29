import React from 'react';
import './EngineeringBackground.css';

const EngineeringBackground = () => {
  return (
    <div className="eng-bg-container">
      {/* Blueprint Grid */}
      <div className="eng-blueprint-grid"></div>

      {/* Pulse Rings (Radar) */}
      <div className="eng-pulse-ring ring-1"></div>
      <div className="eng-pulse-ring ring-2"></div>

      {/* Floating Gears */}
      <svg className="eng-gear gear-1" viewBox="0 0 100 100">
        <path d="M50 30c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 34c-7.7 0-14-6.3-14-14s6.3-14 14-14 14 6.3 14 14-6.3 14-14 14zM50 0l-5.5 15.1c-1.9.4-3.7.9-5.4 1.7L25.4 7.2l-9.5 9.5 9.6 13.7c-.8 1.7-1.3 3.5-1.7 5.4L8.7 41.3v17.4l15.1 5.5c.4 1.9.9 3.7 1.7 5.4l-9.6 13.7 9.5 9.5 13.7-9.6c1.7.8 3.5 1.3 5.4 1.7L41.3 91.3h17.4l5.5-15.1c1.9-.4 3.7-.9 5.4-1.7l13.7 9.6 9.5-9.5-9.6-13.7c.8-1.7 1.3-3.5 1.7-5.4L91.3 58.7V41.3l-15.1-5.5c-.4-1.9-.9-3.7-1.7-5.4l9.6-13.7-9.5-9.5-13.7 9.6c-1.7-.8-3.5-1.3-5.4-1.7L58.7 8.7V0H50z" fill="#B153D7"/>
      </svg>
      <svg className="eng-gear gear-2" viewBox="0 0 100 100">
        <path d="M50 30c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 34c-7.7 0-14-6.3-14-14s6.3-14 14-14 14 6.3 14 14-6.3 14-14 14zM50 0l-5.5 15.1c-1.9.4-3.7.9-5.4 1.7L25.4 7.2l-9.5 9.5 9.6 13.7c-.8 1.7-1.3 3.5-1.7 5.4L8.7 41.3v17.4l15.1 5.5c.4 1.9.9 3.7 1.7 5.4l-9.6 13.7 9.5 9.5 13.7-9.6c1.7.8 3.5 1.3 5.4 1.7L41.3 91.3h17.4l5.5-15.1c1.9-.4 3.7-.9 5.4-1.7l13.7 9.6 9.5-9.5-9.6-13.7c.8-1.7 1.3-3.5 1.7-5.4L91.3 58.7V41.3l-15.1-5.5c-.4-1.9-.9-3.7-1.7-5.4l9.6-13.7-9.5-9.5-13.7 9.6c-1.7-.8-3.5-1.3-5.4-1.7L58.7 8.7V0H50z" fill="#F9B2D7"/>
      </svg>
      <svg className="eng-gear gear-3" viewBox="0 0 100 100">
        <path d="M50 30c-11 0-20 9-20 20s9 20 20 20 20-9 20-20-9-20-20-20zm0 34c-7.7 0-14-6.3-14-14s6.3-14 14-14 14 6.3 14 14-6.3 14-14 14zM50 0l-5.5 15.1c-1.9.4-3.7.9-5.4 1.7L25.4 7.2l-9.5 9.5 9.6 13.7c-.8 1.7-1.3 3.5-1.7 5.4L8.7 41.3v17.4l15.1 5.5c.4 1.9.9 3.7 1.7 5.4l-9.6 13.7 9.5 9.5 13.7-9.6c1.7.8 3.5 1.3 5.4 1.7L41.3 91.3h17.4l5.5-15.1c1.9-.4 3.7-.9 5.4-1.7l13.7 9.6 9.5-9.5-9.6-13.7c.8-1.7 1.3-3.5 1.7-5.4L91.3 58.7V41.3l-15.1-5.5c-.4-1.9-.9-3.7-1.7-5.4l9.6-13.7-9.5-9.5-13.7 9.6c-1.7-.8-3.5-1.3-5.4-1.7L58.7 8.7V0H50z" fill="#B153D7"/>
      </svg>

      {/* Circuit Traces */}
      <svg className="eng-circuit" viewBox="0 0 800 600">
        <path className="trace-1" d="M100,100 L200,100 L200,200 L300,200" fill="none" stroke="#607274" strokeWidth="2" opacity="0.1" />
        <circle cx="100" cy="100" r="4" fill="#607274" opacity="0.1" />
        <circle cx="300" cy="200" r="4" fill="#607274" opacity="0.1" />
        
        <path className="trace-2" d="M700,500 L600,500 L600,400 L500,400" fill="none" stroke="#607274" strokeWidth="2" opacity="0.1" />
        <circle cx="700" cy="500" r="4" fill="#607274" opacity="0.1" />
        <circle cx="500" cy="400" r="4" fill="#607274" opacity="0.1" />
      </svg>

      {/* Floating Particles */}
      {[...Array(10)].map((_, i) => (
        <div key={i} className={`eng-particle p-${i+1}`} style={{
          backgroundColor: i % 3 === 0 ? '#B153D7' : i % 3 === 1 ? '#FFB399' : '#F9B2D7',
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 10}s`,
          width: `${4 + Math.random() * 6}px`,
          height: `${4 + Math.random() * 6}px`
        }}></div>
      ))}
    </div>
  );
};

export default EngineeringBackground;
