import React from 'react';
import './TipOfTheDay.css';

const TIPS = [
  "Store leafy greens with a paper towel to absorb excess moisture and keep them fresh longer.",
  "Keep bananas separate from other fruits to slow down ripening.",
  "Store potatoes and onions separately - they cause each other to spoil faster.",
  "Freeze bread to extend its shelf life and prevent mold.",
  "Store tomatoes at room temperature, not in the refrigerator.",
  "Keep dairy products in the coldest part of your refrigerator.",
  "Store herbs like basil and parsley in water like fresh flowers.",
];

function TipOfTheDay() {
  // Get a consistent tip based on the day
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  const tip = TIPS[dayOfYear % TIPS.length];

  return (
    <div className="tip-of-the-day">
      <h3 className="tip-title">Tip of the day</h3>
      <p className="tip-content">{tip}</p>
    </div>
  );
}

export default TipOfTheDay;
